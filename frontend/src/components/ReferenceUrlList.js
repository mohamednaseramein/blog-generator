import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { addReference } from '../api/blog-api.js';
import { ReferenceUrlCard } from './ReferenceUrlCard.js';
import { Input } from './ui/input.js';
import { Button } from './ui/button.js';
const MAX_REFERENCES = 5;
const URL_REGEX = /^https?:\/\/.+/;
export function ReferenceUrlList({ blogId, initialReferences = [] }) {
    const [references, setReferences] = useState(initialReferences);
    const [inputValue, setInputValue] = useState('');
    const [inputError, setInputError] = useState(null);
    const [adding, setAdding] = useState(false);
    async function handleAdd() {
        const url = inputValue.trim();
        if (!url)
            return;
        if (!URL_REGEX.test(url)) {
            setInputError('Must be a valid URL starting with http:// or https://');
            return;
        }
        if (references.length >= MAX_REFERENCES) {
            setInputError(`Maximum ${MAX_REFERENCES} reference URLs allowed`);
            return;
        }
        setInputError(null);
        setAdding(true);
        try {
            const { reference } = await addReference(blogId, url);
            setReferences((prev) => [...prev, reference]);
            setInputValue('');
        }
        catch (e) {
            setInputError(e.message);
        }
        finally {
            setAdding(false);
        }
    }
    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleAdd();
        }
    }
    const handleRemove = useCallback((refId) => {
        setReferences((prev) => prev.filter((r) => r.id !== refId));
    }, []);
    const handleReferenceUpdate = useCallback((refId, patch) => {
        setReferences((prev) => prev.map((r) => (r.id === refId ? { ...r, ...patch } : r)));
    }, []);
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [references.map((ref) => (_jsx(ReferenceUrlCard, { blogId: blogId, refId: ref.id, url: ref.url, initialStatus: ref.scrapeStatus, initialError: ref.scrapeError, initialExtractionStatus: ref.extractionStatus, initialExtractionJson: ref.extractionJson, onRemove: handleRemove, onReferenceUpdate: handleReferenceUpdate }, ref.id))), references.length < MAX_REFERENCES && (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("div", { className: "min-w-0 flex-1", children: _jsx(Input, { type: "url", placeholder: "https://example.com/reference-article", value: inputValue, onChange: (e) => { setInputValue(e.target.value); setInputError(null); }, onKeyDown: handleKeyDown, disabled: adding, error: !!inputError, "aria-label": "Add reference URL" }) }), _jsx(Button, { type: "button", onClick: () => void handleAdd(), disabled: adding, children: "Add URL" })] }), inputError && (_jsx("p", { className: "text-xs text-red-600", children: inputError })), adding && (_jsxs("p", { className: "flex items-center gap-1.5 text-xs text-slate-500", children: [_jsx("span", { className: "inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" }), "Adding\u2026"] })), _jsxs("p", { className: "text-xs text-slate-400", children: ["Press Enter or use Add URL \u00B7 ", MAX_REFERENCES - references.length, " remaining"] })] })), references.length >= MAX_REFERENCES && (_jsxs("p", { className: "text-xs text-slate-400", children: ["Maximum of ", MAX_REFERENCES, " reference URLs reached."] }))] }));
}
