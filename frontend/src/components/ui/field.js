import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Field({ label, hint, error, required, children }) {
    return (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsxs("label", { className: "text-sm font-medium text-slate-700", children: [label, required && _jsx("span", { "aria-hidden": "true", className: "ml-0.5 text-red-500", children: " *" })] }), hint && _jsx("p", { className: "text-xs text-slate-500", children: hint }), children, error && (_jsxs("p", { role: "alert", className: "text-xs text-red-600 flex items-center gap-1", children: [_jsx("span", { children: "\u26A0" }), " ", error] }))] }));
}
