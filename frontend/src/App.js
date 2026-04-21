import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { BlogBriefForm } from './components/BlogBriefForm.js';
import { AlignmentSummary } from './components/AlignmentSummary.js';
import { WizardProgress } from './components/WizardProgress.js';
import { Button } from './components/ui/button.js';
import { Toast } from './components/ui/toast.js';
import { createBlog } from './api/blog-api.js';
export function App() {
    const [state, setState] = useState({ step: 'idle' });
    const [error, setError] = useState(null);
    async function startNewBlog() {
        setError(null);
        setState({ step: 'creating' });
        try {
            const { blogId } = await createBlog();
            setState({ step: 'brief', blogId });
        }
        catch (e) {
            setError(e.message);
            setState({ step: 'idle' });
        }
    }
    const wizardStep = state.step === 'idle' || state.step === 'creating' ? 1
        : state.step === 'brief' ? 1
            : state.step === 'alignment' ? 2
                : 3;
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50", children: _jsxs("div", { className: "mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "mb-10 text-center", children: [_jsx("div", { className: "mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white text-xl shadow-lg", children: "\u2726" }), _jsx("h1", { className: "text-3xl font-bold tracking-tight text-slate-900", children: "AI Blog Generator" }), _jsx("p", { className: "mt-2 text-slate-500 text-sm", children: "Create a fully-structured, SEO-ready blog post in minutes." })] }), (state.step === 'brief' || state.step === 'alignment' || state.step === 'done') && (_jsx("div", { className: "mb-8", children: _jsx(WizardProgress, { current: wizardStep }) })), _jsxs("div", { className: "rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6 sm:p-8", children: [state.step === 'idle' && (_jsxs("div", { className: "flex flex-col items-center gap-6 py-8 text-center", children: [_jsxs("div", { className: "max-w-sm", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Ready to write?" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Walk through our step-by-step wizard and let AI handle the heavy lifting." })] }), error && _jsx(Toast, { variant: "error", children: error }), _jsx(Button, { onClick: () => void startNewBlog(), size: "md", children: "Start a new blog post \u2192" })] })), state.step === 'creating' && (_jsxs("div", { className: "flex flex-col items-center gap-3 py-12 text-slate-500", children: [_jsx("span", { className: "inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), _jsx("p", { className: "text-sm", children: "Setting up your blog\u2026" })] })), state.step === 'brief' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Step 1 \u2014 Blog Brief" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Tell us about your post. The more detail you give, the better the output." })] }), _jsx(BlogBriefForm, { blogId: state.blogId, onSuccess: () => setState({ step: 'alignment', blogId: state.blogId }) })] })), state.step === 'alignment' && (_jsx(AlignmentSummary, { blogId: state.blogId, onEdit: () => setState({ step: 'brief', blogId: state.blogId }), onConfirmed: () => setState({ step: 'done', blogId: state.blogId }) })), state.step === 'done' && (_jsxs("div", { className: "flex flex-col items-center gap-6 py-8 text-center", children: [_jsx("div", { className: "flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl", children: "\u2713" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "Alignment confirmed!" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "Next up: Research & Outline \u2014 Step 3." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => void startNewBlog(), children: "\u2190 Start another post" })] }))] }), _jsx("p", { className: "mt-6 text-center text-xs text-slate-400", children: "Powered by Claude AI \u00B7 Naser Company" })] }) }));
}
