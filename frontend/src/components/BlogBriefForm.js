import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getBrief, submitBrief, listReferences } from '../api/blog-api.js';
import { ReferenceUrlList } from './ReferenceUrlList.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Field } from './ui/field.js';
import { Toast } from './ui/toast.js';
const schema = z
    .object({
    title: z.string().min(1, 'Title is required').transform((v) => v.trim()),
    primaryKeyword: z.string().min(1, 'Primary keyword is required').transform((v) => v.trim()),
    audiencePersona: z.string().min(1, 'Audience persona is required').transform((v) => v.trim()),
    toneOfVoice: z.string().min(1, 'Tone of voice is required').transform((v) => v.trim()),
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
export function BlogBriefForm({ blogId, onSuccess }) {
    const [submitError, setSubmitError] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [loadingBrief, setLoadingBrief] = useState(true);
    const [existingReferences, setExistingReferences] = useState([]);
    const { register, handleSubmit, reset, formState: { errors, isSubmitting }, } = useForm({ resolver: zodResolver(schema) });
    useEffect(() => {
        let cancelled = false;
        setLoadingBrief(true);
        setLoadError(null);
        Promise.all([getBrief(blogId), listReferences(blogId)])
            .then(([brief, { references }]) => {
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
            setExistingReferences(references);
        })
            .catch(() => {
            if (!cancelled)
                setLoadError(null);
        })
            .finally(() => {
            if (!cancelled)
                setLoadingBrief(false);
        });
        return () => { cancelled = true; };
    }, [blogId, reset]);
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
    return (_jsxs("form", { onSubmit: handleSubmit(onSubmit), noValidate: true, "aria-label": "Blog brief form", className: "flex flex-col gap-6", children: [loadError && _jsx(Toast, { variant: "error", children: loadError }), _jsxs("div", { className: "grid gap-6 sm:grid-cols-2", children: [_jsx(Field, { label: "Blog Title", error: errors.title?.message, required: true, children: _jsx(Input, { id: "title", type: "text", placeholder: "e.g. 10 Tips for Better Sleep", "aria-required": "true", error: !!errors.title, ...register('title') }) }), _jsx(Field, { label: "Primary Keyword", error: errors.primaryKeyword?.message, required: true, children: _jsx(Input, { id: "primaryKeyword", type: "text", placeholder: "e.g. sleep hygiene", "aria-required": "true", error: !!errors.primaryKeyword, ...register('primaryKeyword') }) })] }), _jsx(Field, { label: "Audience Persona", hint: "Describe who will read this post.", error: errors.audiencePersona?.message, required: true, children: _jsx(Textarea, { id: "audiencePersona", rows: 3, placeholder: "e.g. Busy professionals aged 30\u201345 looking for practical wellness advice", "aria-required": "true", error: !!errors.audiencePersona, ...register('audiencePersona') }) }), _jsx(Field, { label: "Tone of Voice", error: errors.toneOfVoice?.message, required: true, children: _jsx(Input, { id: "toneOfVoice", type: "text", placeholder: "e.g. Friendly, expert, conversational", "aria-required": "true", error: !!errors.toneOfVoice, ...register('toneOfVoice') }) }), _jsxs("div", { className: "grid gap-6 sm:grid-cols-2", children: [_jsx(Field, { label: "Word Count Min", error: errors.wordCountMin?.message, required: true, children: _jsx(Input, { id: "wordCountMin", type: "number", min: 1, placeholder: "800", "aria-required": "true", error: !!errors.wordCountMin, ...register('wordCountMin', { valueAsNumber: true }) }) }), _jsx(Field, { label: "Word Count Max", error: errors.wordCountMax?.message, required: true, children: _jsx(Input, { id: "wordCountMax", type: "number", min: 1, placeholder: "1500", "aria-required": "true", error: !!errors.wordCountMax, ...register('wordCountMax', { valueAsNumber: true }) }) })] }), _jsx(Field, { label: "Blog Brief", hint: "Summarise the key points, angle, and any must-include information.", error: errors.blogBrief?.message, required: true, children: _jsx(Textarea, { id: "blogBrief", rows: 6, placeholder: "Describe the blog post you want to create\u2026", "aria-required": "true", error: !!errors.blogBrief, ...register('blogBrief') }) }), _jsx(Field, { label: "Reference URLs", hint: "Optional \u2014 add up to 5 URLs. We'll scrape each one to inform the content.", children: _jsx(ReferenceUrlList, { blogId: blogId, initialReferences: existingReferences }) }), submitError && _jsx(Toast, { variant: "error", children: submitError }), _jsx("div", { className: "flex justify-end pt-2", children: _jsx(Button, { type: "submit", disabled: isSubmitting, "aria-busy": isSubmitting, children: isSubmitting ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" }), "Saving\u2026"] })) : ('Save & Continue →') }) })] }));
}
