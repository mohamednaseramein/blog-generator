import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const PRIMARY_KEYWORD_MAX = 4_000;
const TITLE_MAX = 500;
const TONE_MAX = 200;
import { getBrief, submitBrief, listReferences, type BlogReference } from '../api/blog-api.js';
import { getProfile } from '../api/profile-api.js';
import { ReferenceUrlList } from './ReferenceUrlList.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Field } from './ui/field.js';
import { Toast } from './ui/toast.js';

const schema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(TITLE_MAX, `At most ${TITLE_MAX} characters`)
      .transform((v) => v.trim()),
    primaryKeyword: z
      .string()
      .min(1, 'Primary keyword is required')
      .max(PRIMARY_KEYWORD_MAX, `At most ${PRIMARY_KEYWORD_MAX} characters`)
      .transform((v) => v.trim()),
    audiencePersona: z.string().min(1, 'Audience persona is required').transform((v) => v.trim()),
    toneOfVoice: z
      .string()
      .min(1, 'Tone of voice is required')
      .max(TONE_MAX, `At most ${TONE_MAX} characters`)
      .transform((v) => v.trim()),
    wordCountMin: z
      .number({ invalid_type_error: 'Must be a number' })
      .int()
      .min(1, 'Must be greater than 0'),
    wordCountMax: z
      .number({ invalid_type_error: 'Must be a number' })
      .int()
      .min(1, 'Must be greater than 0'),
    blogBrief: z.string().min(1, 'Blog brief is required').transform((v) => v.trim()),
  })
  .refine((d) => d.wordCountMax >= d.wordCountMin, {
    message: 'Max must be ≥ min',
    path: ['wordCountMax'],
  });

type FormValues = z.input<typeof schema>;

/** New blogs have no `blog_briefs` row yet. GET /brief returns 404 with this message. */
function isBriefNotFoundError(e: unknown): boolean {
  return e instanceof Error && e.message === 'Brief not found';
}

const EMPTY_BRIEF_FORM: FormValues = {
  title: '',
  primaryKeyword: '',
  audiencePersona: '',
  toneOfVoice: '',
  wordCountMin: 800,
  wordCountMax: 1500,
  blogBrief: '',
};

interface Props {
  blogId: string;
  activeProfileId?: string | null;
  onSuccess: () => void;
}

export function BlogBriefForm({ blogId, activeProfileId, onSuccess }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(true);
  const [existingReferences, setExistingReferences] = useState<BlogReference[]>([]);
  const [prefillSource, setPrefillSource] = useState<'brief' | 'profile' | 'empty' | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let cancelled = false;
    setLoadingBrief(true);
    setLoadError(null);
    setPrefillSource(null);

    void (async () => {
      try {
        const { references } = await listReferences(blogId);
        if (cancelled) return;
        setExistingReferences(references);

        try {
          const brief = await getBrief(blogId);
          if (cancelled) return;
          reset({
            title: brief.title,
            primaryKeyword: brief.primaryKeyword,
            audiencePersona: brief.audiencePersona,
            toneOfVoice: brief.toneOfVoice,
            wordCountMin: brief.wordCountMin,
            wordCountMax: brief.wordCountMax,
            blogBrief: brief.blogBrief,
          });
          setPrefillSource('brief');
        } catch (e) {
          if (cancelled) return;
          if (isBriefNotFoundError(e)) {
            // New blog — pre-fill from active profile if available
            if (activeProfileId) {
              try {
                const { profile } = await getProfile(activeProfileId);
                if (!cancelled) {
                  reset({
                    ...EMPTY_BRIEF_FORM,
                    audiencePersona: profile.audiencePersona,
                    toneOfVoice: profile.toneOfVoice,
                  });
                  setPrefillSource('profile');
                }
              } catch {
                if (!cancelled) {
                  reset(EMPTY_BRIEF_FORM);
                  setPrefillSource('empty');
                }
              }
            } else {
              reset(EMPTY_BRIEF_FORM);
              setPrefillSource('empty');
            }
          } else {
            throw e;
          }
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError((e as Error).message ?? 'Could not load your brief. Try refreshing the page.');
        }
      } finally {
        if (!cancelled) setLoadingBrief(false);
      }
    })();

    return () => { cancelled = true; };
  }, [blogId, reset, activeProfileId]);

  useEffect(() => {
    // If the user switches profiles while working on a *new* blog (no saved brief),
    // update the persona/tone defaults from the selected profile.
    // Avoid clobbering user edits once they start typing.
    if (!activeProfileId) return;
    if (loadingBrief) return;
    if (prefillSource !== 'profile' && prefillSource !== 'empty') return;
    if (isDirty) return;

    let cancelled = false;
    void (async () => {
      try {
        const { profile } = await getProfile(activeProfileId);
        if (cancelled) return;
        const current = getValues();
        reset({
          ...current,
          audiencePersona: profile.audiencePersona,
          toneOfVoice: profile.toneOfVoice,
        });
        setPrefillSource('profile');
      } catch {
        // ignore — keep existing form values
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProfileId, getValues, isDirty, loadingBrief, prefillSource, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await submitBrief(blogId, values);
      onSuccess();
    } catch (e) {
      setSubmitError((e as Error).message);
    }
  }

  if (loadingBrief) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-slate-500" role="status" aria-label="Loading saved brief">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
        <p className="text-sm">Loading your saved inputs…</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Blog brief form"
      className="flex flex-col gap-6"
    >
      {loadError && <Toast variant="error">{loadError}</Toast>}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Blog Title" error={errors.title?.message} required>
          <Input
            id="title"
            type="text"
            placeholder="e.g. 10 Tips for Better Sleep"
            aria-required="true"
            error={!!errors.title}
            {...register('title')}
          />
        </Field>

        <Field label="Primary Keyword" error={errors.primaryKeyword?.message} required>
          <Input
            id="primaryKeyword"
            type="text"
            placeholder="e.g. sleep hygiene"
            aria-required="true"
            error={!!errors.primaryKeyword}
            {...register('primaryKeyword')}
          />
        </Field>
      </div>

      <Field
        label="Audience Persona"
        hint="Describe who will read this post."
        error={errors.audiencePersona?.message}
        required
      >
        <Textarea
          id="audiencePersona"
          rows={3}
          placeholder="e.g. Busy professionals aged 30–45 looking for practical wellness advice"
          aria-required="true"
          error={!!errors.audiencePersona}
          {...register('audiencePersona')}
        />
      </Field>

      <Field label="Tone of Voice" error={errors.toneOfVoice?.message} required>
        <Input
          id="toneOfVoice"
          type="text"
          placeholder="e.g. Friendly, expert, conversational"
          aria-required="true"
          error={!!errors.toneOfVoice}
          {...register('toneOfVoice')}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Word Count Min" error={errors.wordCountMin?.message} required>
          <Input
            id="wordCountMin"
            type="number"
            min={1}
            placeholder="800"
            aria-required="true"
            error={!!errors.wordCountMin}
            {...register('wordCountMin', { valueAsNumber: true })}
          />
        </Field>

        <Field label="Word Count Max" error={errors.wordCountMax?.message} required>
          <Input
            id="wordCountMax"
            type="number"
            min={1}
            placeholder="1500"
            aria-required="true"
            error={!!errors.wordCountMax}
            {...register('wordCountMax', { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Field
        label="Blog Brief"
        hint="Summarise the key points, angle, and any must-include information."
        error={errors.blogBrief?.message}
        required
      >
        <Textarea
          id="blogBrief"
          rows={6}
          placeholder="Describe the blog post you want to create…"
          aria-required="true"
          error={!!errors.blogBrief}
          {...register('blogBrief')}
        />
      </Field>

      <Field
        label="Reference URLs"
        hint="Optional: add up to 5 URLs. We'll scrape each one to inform the content."
      >
        <ReferenceUrlList blogId={blogId} initialReferences={existingReferences} />
      </Field>

      {submitError && <Toast variant="error">{submitError}</Toast>}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Saving…
            </span>
          ) : (
            'Save & Continue →'
          )}
        </Button>
      </div>
    </form>
  );
}
