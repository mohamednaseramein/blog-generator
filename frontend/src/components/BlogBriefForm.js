import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitBrief } from '../api/blog-api.js';
import { ScrapeStatusIndicator } from './ScrapeStatusIndicator.js';
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
    referenceUrl: z
        .string()
        .optional()
        .transform((v) => v?.trim() ?? '')
        .refine((v) => v === '' || /^https?:\/\/.+/.test(v), 'Must be a valid URL'),
})
    .refine((d) => d.wordCountMax >= d.wordCountMin, {
    message: 'Max must be ≥ min',
    path: ['wordCountMax'],
});
export function BlogBriefForm({ blogId, onSuccess }) {
    const [submittedBlogId, setSubmittedBlogId] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    const { register, handleSubmit, formState: { errors, isSubmitting }, } = useForm({ resolver: zodResolver(schema) });
    async function onSubmit(values) {
        setSubmitError(null);
        try {
            const result = await submitBrief(blogId, {
                ...values,
                referenceUrl: values.referenceUrl || undefined,
            });
            setSubmittedBlogId(result.blogId);
            onSuccess();
        }
        catch (e) {
            setSubmitError(e.message);
        }
    }
    return (_jsxs("form", { onSubmit: handleSubmit(onSubmit), noValidate: true, "aria-label": "Blog brief form", className: "flex flex-col gap-6", children: [_jsxs("div", { className: "grid gap-6 sm:grid-cols-2", children: [_jsx(Field, { label: "Blog Title", error: errors.title?.message, required: true, children: _jsx(Input, { id: "title", type: "text", placeholder: "e.g. 10 Tips for Better Sleep", "aria-required": "true", error: !!errors.title, ...register('title') }) }), _jsx(Field, { label: "Primary Keyword", error: errors.primaryKeyword?.message, required: true, children: _jsx(Input, { id: "primaryKeyword", type: "text", placeholder: "e.g. sleep hygiene", "aria-required": "true", error: !!errors.primaryKeyword, ...register('primaryKeyword') }) })] }), _jsx(Field, { label: "Audience Persona", hint: "Describe who will read this post.", error: errors.audiencePersona?.message, required: true, children: _jsx(Textarea, { id: "audiencePersona", rows: 3, placeholder: "e.g. Busy professionals aged 30\u201345 looking for practical wellness advice", "aria-required": "true", error: !!errors.audiencePersona, ...register('audiencePersona') }) }), _jsx(Field, { label: "Tone of Voice", error: errors.toneOfVoice?.message, required: true, children: _jsx(Input, { id: "toneOfVoice", type: "text", placeholder: "e.g. Friendly, expert, conversational", "aria-required": "true", error: !!errors.toneOfVoice, ...register('toneOfVoice') }) }), _jsxs("div", { className: "grid gap-6 sm:grid-cols-2", children: [_jsx(Field, { label: "Word Count Min", error: errors.wordCountMin?.message, required: true, children: _jsx(Input, { id: "wordCountMin", type: "number", min: 1, placeholder: "800", "aria-required": "true", error: !!errors.wordCountMin, ...register('wordCountMin', { valueAsNumber: true }) }) }), _jsx(Field, { label: "Word Count Max", error: errors.wordCountMax?.message, required: true, children: _jsx(Input, { id: "wordCountMax", type: "number", min: 1, placeholder: "1500", "aria-required": "true", error: !!errors.wordCountMax, ...register('wordCountMax', { valueAsNumber: true }) }) })] }), _jsx(Field, { label: "Blog Brief", hint: "Summarise the key points, angle, and any must-include information.", error: errors.blogBrief?.message, required: true, children: _jsx(Textarea, { id: "blogBrief", rows: 6, placeholder: "Describe the blog post you want to create\u2026", "aria-required": "true", error: !!errors.blogBrief, ...register('blogBrief') }) }), _jsx(Field, { label: "Reference URL", hint: "Optional \u2014 we'll scrape this page to inform the content.", error: errors.referenceUrl?.message, children: _jsx(Input, { id: "referenceUrl", type: "url", placeholder: "https://example.com/reference-article", error: !!errors.referenceUrl, ...register('referenceUrl') }) }), submittedBlogId && _jsx(ScrapeStatusIndicator, { blogId: submittedBlogId }), submitError && _jsx(Toast, { variant: "error", children: submitError }), _jsx("div", { className: "flex justify-end pt-2", children: _jsx(Button, { type: "submit", disabled: isSubmitting, "aria-busy": isSubmitting, children: isSubmitting ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" }), "Saving\u2026"] })) : ('Save & Continue →') }) })] }));
}
