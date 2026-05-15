import type { Request, Response, NextFunction } from 'express';
import { getUserId } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import { getBlogByIdAndUser } from '../repositories/blog-repository.js';
import { getDraftByBlogId } from '../repositories/blog-draft-repository.js';
import {
  blogAiCheckRowToApiResponse,
  findFreshBlogAiCheck,
  insertBlogAiCheck,
} from '../repositories/blog-ai-checks-repository.js';
import type { AiCheckApiResponse } from '../domain/ai-check-types.js';
import { computeAiCheckInputHash, normaliseDraftBody } from '../lib/input-hash.js';
import { stripExcludedSegments, wordCount } from '../lib/exclusion-stripper.js';
import { looksLikeEnglish } from '../lib/language-detector.js';
import { allowAiCheckForBlog } from '../lib/ai-check-rate-limit.js';
import { getRubricVersion } from '../lib/ai-detector-rubric.js';
import {
  buildLanguageUnsupportedResult,
  finalizeMode,
  getLongPostWordLimit,
  getShortPostWordThreshold,
  listLineDensity,
  runAiDetectorLlm,
  truncateToWordBudget,
} from '../services/ai-detector-service.js';
import { assertWithinQuota } from '../services/quota-enforcement.js';

function buildHaystack(cleanedBody: string, seoTitle: string, meta: string): string {
  return `${cleanedBody}\n\n${seoTitle}\n\n${meta}`;
}

function buildUnscoredMessage(params: {
  bodyForLlm: string;
  seoTitle: string;
  meta: string;
  totalWords: number;
  truncated: boolean;
  longLimit: number;
}): string {
  const truncNote = params.truncated
    ? `Note: only the first ${params.longLimit} words of the body were scored (${params.totalWords} words before trim).`
    : `Body word count after exclusions: ${params.totalWords}.`;
  return [
    'Scored content follows. Evidence snippets you return must be copied verbatim from this material.',
    '',
    '--- BODY (code/urls removed for style scoring) ---',
    params.bodyForLlm,
    '',
    '--- SEO TITLE ---',
    params.seoTitle || '(empty)',
    '',
    '--- META DESCRIPTION ---',
    params.meta || '(empty)',
    '',
    truncNote,
  ].join('\n');
}

export async function handleRunAiCheck(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const blogId = req.params['id'] as string;

    const blog = await getBlogByIdAndUser(blogId, userId);
    if (!blog) throw new AppError(404, 'NOT_FOUND', 'Blog not found');

    const draft = await getDraftByBlogId(blogId);
    if (!draft || !normaliseDraftBody(draft.draftMarkdown)) {
      throw new AppError(409, 'DRAFT_NOT_READY', 'Generate a draft before running an AI check');
    }

    const bodyRaw = draft.draftMarkdown;
    const seoTitle = (draft.seoTitle ?? '').trim();
    const meta = (draft.metaDescription ?? '').trim();

    const inputHash = computeAiCheckInputHash(bodyRaw, seoTitle, meta);
    const rubricVersion = getRubricVersion();

    const cacheRow = await findFreshBlogAiCheck(blogId, inputHash, rubricVersion);
    if (cacheRow) {
      const response = blogAiCheckRowToApiResponse(cacheRow, true);
      res.json(response);
      return;
    }

    if (!allowAiCheckForBlog(blogId)) {
      throw new AppError(429, 'RATE_LIMITED', 'Too many AI checks for this draft — try again in an hour.');
    }

    await assertWithinQuota(userId, 'ai_checks');

    const { cleanedForScoring, excluded } = stripExcludedSegments(bodyRaw);
    const wc = wordCount(cleanedForScoring);
    const longLimit = getLongPostWordLimit();
    const shortThreshold = getShortPostWordThreshold();
    const { text: bodyForLlm, truncated, totalWords } = truncateToWordBudget(cleanedForScoring, longLimit);

    const haystackForEvidence = buildHaystack(bodyForLlm, seoTitle, meta);

    if (process.env['LOG_AI_CHECK_PAYLOADS'] === 'true') {
      console.log(`[ai-check] blogId=${blogId} wordCount=${wc} truncated=${truncated}`);
    }

    if (!looksLikeEnglish(cleanedForScoring)) {
      const unsup = buildLanguageUnsupportedResult();
      const response: AiCheckApiResponse = {
        rubric_version: rubricVersion,
        mode: 'language_unsupported',
        cached: false,
        scored_at: new Date().toISOString(),
        ai_likelihood_percent: null,
        human_likelihood_percent: null,
        uncertainty_percent: null,
        top_signals: unsup.top_signals,
        rule_breakdown: [],
        section_scores: [],
        excluded_segments: excluded,
        creator_tips: unsup.creator_tips,
        truncation_note: truncated
          ? `Scored first ${longLimit} words of ${totalWords} (body only, after exclusions).`
          : null,
        llm: null,
        tokens: null,
      };

      const stored = {
        top_signals: response.top_signals,
        rule_breakdown: response.rule_breakdown,
        section_scores: response.section_scores,
        excluded_segments: response.excluded_segments,
        creator_tips: response.creator_tips,
        truncation_note: response.truncation_note,
      };
      const inserted = await insertBlogAiCheck({
        blogId,
        inputHash,
        rubricVersion,
        aiLikelihoodPercent: null,
        humanLikelihoodPercent: null,
        uncertaintyPercent: null,
        mode: 'language_unsupported',
        result: stored,
        llmProvider: 'none',
        llmModel: 'none',
        tokensInput: 0,
        tokensOutput: 0,
      });
      if (!inserted) {
        const hit = await findFreshBlogAiCheck(blogId, inputHash, rubricVersion);
        if (hit) {
          res.json(blogAiCheckRowToApiResponse(hit, true));
          return;
        }
      }
      res.json(response);
      return;
    }

    let extraUncertainty = 0;
    if (wc < shortThreshold) extraUncertainty += 20;
    if (listLineDensity(cleanedForScoring) >= 0.4) extraUncertainty += 25;
    extraUncertainty = Math.min(extraUncertainty, 80);

    const userMessage = buildUnscoredMessage({
      bodyForLlm,
      seoTitle,
      meta,
      totalWords: wc,
      truncated,
      longLimit,
    });

    let llm;
    try {
      llm = await runAiDetectorLlm({
        haystackForEvidence,
        userMessage,
        extraUncertainty,
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'AI_BAD_JSON') {
        throw new AppError(502, 'AI_BAD_RESPONSE', 'The AI returned an unreadable score — please retry.');
      }
      console.error('[ai-check] LLM failure:', e);
      throw new AppError(502, 'AI_UNAVAILABLE', 'The AI service could not score this draft right now.');
    }

    const { result, inputTokens, outputTokens, model } = llm;
    const mode = finalizeMode(result.ai_likelihood_percent);

    const truncationNote =
      result.truncation_note ??
      (truncated ? `Scored first ${longLimit} words of ${totalWords} (body only, after exclusions).` : null);

    const response: AiCheckApiResponse = {
      rubric_version: rubricVersion,
      mode,
      cached: false,
      scored_at: new Date().toISOString(),
      ai_likelihood_percent: result.ai_likelihood_percent,
      human_likelihood_percent: result.human_likelihood_percent,
      uncertainty_percent: result.uncertainty_percent,
      top_signals: result.top_signals,
      rule_breakdown: result.rule_breakdown,
      section_scores: result.section_scores,
      excluded_segments: excluded,
      creator_tips:
        result.ai_likelihood_percent <= 30
          ? ['Looks human-written for this rubric — optional tweaks only.']
          : result.creator_tips,
      truncation_note: truncationNote,
      llm: { provider: 'anthropic', model },
      tokens: { input: inputTokens, output: outputTokens },
    };

    const storedPayload = {
      top_signals: response.top_signals,
      rule_breakdown: response.rule_breakdown,
      section_scores: response.section_scores,
      excluded_segments: response.excluded_segments,
      creator_tips: response.creator_tips,
      truncation_note: response.truncation_note,
    };

    const inserted = await insertBlogAiCheck({
      blogId,
      inputHash,
      rubricVersion,
      aiLikelihoodPercent: result.ai_likelihood_percent,
      humanLikelihoodPercent: result.human_likelihood_percent,
      uncertaintyPercent: result.uncertainty_percent,
      mode,
      result: storedPayload,
      llmProvider: 'anthropic',
      llmModel: model,
      tokensInput: inputTokens,
      tokensOutput: outputTokens,
    });

    if (!inserted) {
      const hit = await findFreshBlogAiCheck(blogId, inputHash, rubricVersion);
      if (hit) {
        res.json(blogAiCheckRowToApiResponse(hit, true));
        return;
      }
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
}
