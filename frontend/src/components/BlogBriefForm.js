import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
const PRIMARY_KEYWORD_MAX = 4_000;
const TITLE_MAX = 500;
const TONE_MAX = 200;
import { getBrief, submitBrief, listReferences } from '../api/blog-api.js';
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
/** New blogs have no `blog_briefs` row yet. GET /brief returns 404 with this message. */
function isBriefNotFoundError(e) {
    return e instanceof Error && e.message === 'Brief not found';
}
const EMPTY_BRIEF_FORM = {
    title: '',
    primaryKeyword: '',
    audiencePersona: '',
    toneOfVoice: '',
    wordCountMin: 800,
    wordCountMax: 1500,
    blogBrief: '',
};
export function BlogBriefForm({ blogId, activeProfileId, onSuccess }) {
    const [submitError, setSubmitError] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [loadingBrief, setLoadingBrief] = useState(true);
    const [existingReferences, setExistingReferences] = useState([]);
    const [prefillSource, setPrefillSource] = useState(null);
    const { register, handleSubmit, reset, getValues, formState: { errors, isSubmitting, dirtyFields }, } = useForm({ resolver: zodResolver(schema) });
    useEffect(() => {
        let cancelled = false;
        setLoadingBrief(true);
        setLoadError(null);
        setPrefillSource(null);
        void (async () => {
            try {
                const { references } = await listReferences(blogId);
                if (cancelled)
                    return;
                setExistingReferences(references);
                try {
                    const brief = await getBrief(blogId);
                    if (cancelled)
                        return;
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
                }
                catch (e) {
                    if (cancelled)
                        return;
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
                            }
                            catch {
                                if (!cancelled) {
                                    reset(EMPTY_BRIEF_FORM);
                                    setPrefillSource('empty');
                                }
                            }
                        }
                        else {
                            reset(EMPTY_BRIEF_FORM);
                            setPrefillSource('empty');
                        }
                    }
                    else {
                        throw e;
                    }
                }
            }
            catch (e) {
                if (!cancelled) {
                    setLoadError(e.message ?? 'Could not load your brief. Try refreshing the page.');
                }
            }
            finally {
                if (!cancelled)
                    setLoadingBrief(false);
            }
        })();
        return () => { cancelled = true; };
    }, [blogId, reset, activeProfileId]);
    useEffect(() => {
        // If the user switches profiles while working on a *new* blog (no saved brief),
        // update the persona/tone defaults from the selected profile.
        // Avoid clobbering user edits once they start typing.
        if (!activeProfileId)
            return;
        if (loadingBrief)
            return;
        if (prefillSource !== 'profile' && prefillSource !== 'empty')
            return;
        if (dirtyFields.audiencePersona || dirtyFields.toneOfVoice)
            return;
        let cancelled = false;
        void (async () => {
            try {
                const { profile } = await getProfile(activeProfileId);
                if (cancelled)
                    return;
                const current = getValues();
                reset({
                    ...current,
                    audiencePersona: profile.audiencePersona,
                    toneOfVoice: profile.toneOfVoice,
                });
                setPrefillSource('profile');
            }
            catch {
                // ignore — keep existing form values
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeProfileId, dirtyFields.audiencePersona, dirtyFields.toneOfVoice, getValues, loadingBrief, prefillSource, reset]);
    }, [activeProfileId, dirtyFields.audiencePersona, dirtyFields.toneOfVoice, getValues, loadingBrief, prefillSource, reset]);
    async function onSubmit(values) {
        setSubmitError(null);
        try {
            await submitBrief(blogId, values);
            onSuccess();
        }
        catch (e) {
            setSubmitError(e.message);
        }
    }
    if (loadingBrief) {
        return (_jsxs("div", { className: "flex flex-col items-center gap-3 py-12 text-slate-500", role: "status", "aria-label": "Loading saved brief", children: [_jsx("span", { className: "inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), _jsx("p", { className: "text-sm", children: "Loading your saved inputs\u2026" })] }));
    }
    return (_jsxs("form", { onSubmit: handleSubmit(onSubmit), noValidate: true, "aria-label": "Blog brief form", className: "flex flex-col gap-6", children: [loadError && _jsx(Toast, { variant: "error", children: loadError }), _jsxs("div", { className: "grid gap-6 sm:grid-cols-2", children: [_jsx(Field, { label: "Blog Title", error: errors.title?.message, required: true, children: _jsx(Input, { id: "title", type: "text", placeholder: "e.g. 10 Tips for Better Sleep", "aria-required": "true", error: !!errors.title, ...register('title') }) }), _jsx(Field, { label: "Primary Keyword", error: errors.primaryKeyword?.message, required: true, children: _jsx(Input, { id: "primaryKeyword", type: "text", placeholder: "e.g. sleep hygiene", "aria-required": "true", error: !!errors.primaryKeyword, ...register('primaryKeyword') }) })] }), _jsx(Field, { label: "Audience Persona", hint: "Describe who will read this post.", error: errors.audiencePersona?.message, required: true, children: _jsx(Textarea, { id: "audiencePersona", rows: 3, placeholder: "e.g. Busy professionals aged 30\u201345 looking for practical wellness advice", "aria-required": "true", error: !!errors.audiencePersona, ...register('audiencePersona') }) }), _jsx(Field, { label: "Tone of Voice", error: errors.toneOfVoice?.message, required: true, children: _jsx(Input, { id: "toneOfVoice", type: "text", placeholder: "e.g. Friendly, expert, conversational", "aria-required": "true", error: !!errors.toneOfVoice, ...register('toneOfVoice') }) }), _jsxs("div", { className: "grid gap-6 sm:grid-cols-2", children: [_jsx(Field, { label: "Word Count Min", error: errors.wordCountMin?.message, required: true, children: _jsx(Input, { id: "wordCountMin", type: "number", min: 1, placeholder: "800", "aria-required": "true", error: !!errors.wordCountMin, ...register('wordCountMin', { valueAsNumber: true }) }) }), _jsx(Field, { label: "Word Count Max", error: errors.wordCountMax?.message, required: true, children: _jsx(Input, { id: "wordCountMax", type: "number", min: 1, placeholder: "1500", "aria-required": "true", error: !!errors.wordCountMax, ...register('wordCountMax', { valueAsNumber: true }) }) })] }), _jsx(Field, { label: "Blog Brief", hint: "Summarise the key points, angle, and any must-include information.", error: errors.blogBrief?.message, required: true, children: _jsx(Textarea, { id: "blogBrief", rows: 6, placeholder: "Describe the blog post you want to create\u2026", "aria-required": "true", error: !!errors.blogBrief, ...register('blogBrief') }) }), _jsx(Field, { label: "Reference URLs", hint: "Optional: add up to 5 URLs. We'll scrape each one to inform the content.", children: _jsx(ReferenceUrlList, { blogId: blogId, initialReferences: existingReferences }) }), submitError && _jsx(Toast, { variant: "error", children: submitError }), _jsx("div", { className: "flex justify-end pt-2", children: _jsx(Button, { type: "submit", disabled: isSubmitting, "aria-busy": isSubmitting, children: isSubmitting ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" }), "Saving\u2026"] })) : ('Save & Continue →') }) })] }));
}
