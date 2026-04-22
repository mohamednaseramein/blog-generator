# Task: Publish step — preview-first layout and export panel

**Priority:** P1  
**Driver:** The Step 5 screen felt long, copy-heavy, and visually dominated by a highlighted “copy full” card instead of the article preview. We aligned on preview-first, unified export, neutral chrome, and optional two-column layout on large viewports.  
**Scope:** `frontend/src/components/PublishStep.tsx` (and emitted `PublishStep.js`); no API or `publishContent` contract changes.  

**Acceptance criteria**

1. **Preview first:** On all breakpoints, the post preview (HTML / Markdown toggle) appears **before** the export/copy block in document order.  
2. **Large screens:** A **two-column** layout: preview on the **left**, export actions on the **right** (stacked to a single column on small screens, preview on top).  
3. **Unified export panel:** A single **neutral** card (`border-slate-200`, white background) for all copy actions; remove the indigo “Copy full post” treatment so it does not compete with the preview.  
4. **Hierarchy:** “Copy full post” (Markdown + HTML) remains **primary** at the top of the export panel. **Field-by-field** copy (title, post body) lives in a **disclosure** collapsed by default. **SEO & social** remains a **separate** disclosure, collapsed by default, with slug and meta + copy.  
5. **Sticky export (desktop):** On `lg+`, the export column is **sticky** with internal scroll if content is tall, so key actions stay reachable while scanning the preview.  
6. **Copy behavior & analytics:** Existing `copy()` calls and `ExportSection` values are unchanged.  
7. **Accessibility:** Disclosures use `aria-expanded`; preview toggle keeps a visible label; focus order follows reading order (preview, then export).  

**Risks:** Sticky + nested scroll can confuse keyboard users; mitigated by keeping export panel height bounded and testing tab order.

**Status:** Implemented in branch (see PR).
