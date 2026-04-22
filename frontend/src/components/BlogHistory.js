import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { listBlogs } from '../api/blog-api.js';
import { Button } from './ui/button.js';
import { Toast } from './ui/toast.js';
const STEP_LABELS = {
    0: 'Not started',
    1: 'Brief',
    2: 'Alignment',
    3: 'Outline',
    4: 'Draft',
    5: 'Publish',
    6: 'Done',
};
function stepLabel(step) {
    return STEP_LABELS[step] ?? `Step ${step}`;
}
function StepBadge({ step, done }) {
    const notStarted = step === 0;
    return (_jsx("span", { className: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${done
            ? 'bg-green-100 text-green-700'
            : notStarted
                ? 'bg-slate-100 text-slate-500'
                : 'bg-indigo-100 text-indigo-700'}`, children: done ? '✓ Done' : stepLabel(step) }));
}
export function BlogHistory({ onResume, onNew }) {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        setLoading(true);
        listBlogs()
            .then(({ blogs: b }) => setBlogs(b))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-800", children: "My blogs" }), _jsx("p", { className: "mt-0.5 text-sm text-slate-500", children: "Pick up where you left off, or start fresh." })] }), _jsx(Button, { size: "sm", onClick: onNew, children: "+ New post" })] }), loading && (_jsx("div", { className: "flex items-center justify-center py-10", children: _jsx("span", { className: "inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }) })), error && _jsx(Toast, { variant: "error", children: error }), !loading && !error && blogs.length === 0 && (_jsxs("div", { className: "flex flex-col items-center gap-3 py-12 text-center text-slate-400", children: [_jsx("p", { className: "text-sm", children: "No blog posts yet." }), _jsx(Button, { size: "sm", onClick: onNew, children: "Start your first post \u2192" })] })), !loading && blogs.length > 0 && (_jsx("ul", { className: "flex flex-col gap-3", children: blogs.map((blog) => {
                    const done = blog.currentStep >= 6;
                    const date = new Date(blog.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    });
                    const title = blog.title ?? 'Untitled';
                    return (_jsxs("li", { className: "flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50 transition-colors", children: [_jsxs("div", { className: "flex min-w-0 flex-col gap-1", children: [_jsx("span", { className: `truncate text-sm font-medium ${blog.title ? 'text-slate-800' : 'text-slate-400 italic'}`, children: title }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(StepBadge, { step: blog.currentStep, done: done }), _jsx("span", { className: "text-xs text-slate-400", children: date })] })] }), _jsx(Button, { size: "sm", variant: done ? 'ghost' : undefined, onClick: () => onResume(blog.id, blog.currentStep), children: done ? 'View' : 'Continue →' })] }, blog.id));
                }) }))] }));
}
