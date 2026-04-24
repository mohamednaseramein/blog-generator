# QA Test Plan: Reference Analysis Fixes (#67, #69)

## Overview

This test plan verifies two critical fixes to the reference analysis workflow:
- **#67**: Frontend polling resilience (survives transient network errors)
- **#69**: Backend extraction status logging (surfaces failures, updates DB)

Together, these fixes prevent the "Analysing reference…" spinner from freezing indefinitely when network blips occur or backend updates fail silently.

## Scope

**In Scope:**
- Frontend polling recovery on network errors
- Backend extraction logging at each pipeline stage
- Database status updates after extraction completes
- Error logging when extraction fails

**Out of Scope:**
- Reference scraping logic (tested separately in #66)
- AI model behavior changes (extraction prompt unchanged)
- UI/UX visual design validation

## Test Cases

### TC-001: Polling Survives Single Transient Network Failure

**Objective:** Verify polling doesn't permanently die on one network blip.

**Setup:**
1. Open blog generator, create new brief
2. Add one reference URL (use a real, responsive URL)
3. Save brief → triggers extraction background job

**Steps:**
1. Watch frontend card show "Scraping reference…" spinner
2. Scraping completes → card shows "Analysing reference…" spinner
3. In browser DevTools → Network tab → toggle throttle to "Slow 3G"
4. Observe one polling request timeout or fail (watch Network tab)
5. Remove throttle (restore full network)

**Expected Result:**
- Polling does NOT call `clearInterval()` on the first error
- Spinner continues (increments `consecutiveErrors` counter)
- After network restores, polling retries and eventually completes
- Card displays extraction results OR "no relevant references" message

**Pass Criteria:** ✅ If spinner is not frozen after network blip and eventually resolves

**Note:** Polling is set to retry up to 5 consecutive errors before stopping. One blip should recover.

---

### TC-002: Polling Stops Gracefully After 5 Consecutive Errors

**Objective:** Verify polling doesn't retry forever; stops after threshold.

**Setup:** Same as TC-001

**Steps:**
1. Setup polling in "Analysing reference…" state (follow TC-001 steps 1-2)
2. In DevTools → throttle to "Offline"
3. Allow 5+ polling requests to fail consecutively
4. Observe polling attempts in Network tab

**Expected Result:**
- Polling attempts 5 consecutive failures
- On 5th failure, polling stops (no 6th attempt)
- Spinner remains but doesn't freeze the UI (non-blocking)
- User sees clear indication (can click "retry" or similar if implemented)

**Pass Criteria:** ✅ If polling stops after exactly 5 failures, not indefinitely

---

### TC-003: Extraction Status Updates in Database

**Objective:** Verify backend extraction updates DB even when network is unstable.

**Setup:**
1. Add reference URL to blog
2. Save brief → triggers extraction

**Steps:**
1. Monitor backend logs: `tail -f logs/app.log | grep reference-extraction-runner`
2. Look for: `[reference-extraction-runner] starting extraction for <ref-id>`
3. Wait for extraction completion log:
   - Success: `[reference-extraction-runner] completed <ref-id>: status=success`
   - Irrelevant: `[reference-extraction-runner] completed <ref-id>: status=irrelevant`
4. Query database:
   ```sql
   SELECT id, extractionStatus, extractionJson FROM blog_references 
   WHERE id = '<ref-id>';
   ```

**Expected Result:**
- Log shows extraction started
- Log shows extraction completed with final status (not "pending")
- Database query returns `extractionStatus = 'success'` OR `'irrelevant'` (not 'pending')
- Frontend polling completes and displays results

**Pass Criteria:** ✅ If DB status is updated AND log shows completion

---

### TC-004: Extraction Failure is Logged Clearly

**Objective:** Verify backend failures surface in logs (not silent).

**Setup:**
1. Add reference URL that will fail extraction (e.g., content-light page, blocked access)
2. Save brief

**Steps:**
1. Monitor backend logs
2. Look for failure logs:
   - `[reference-extraction-runner] extraction failed for <ref-id>: [error message]`
   - `[reference-extraction-runner] marked <ref-id> as failed`
3. Check database: `extractionStatus = 'failed'`
4. View `extractionJson` to see failure reason

**Expected Result:**
- Error is logged with specific error message (not swallowed)
- Database status updated to 'failed'
- Failure message available for debugging
- Frontend can handle 'failed' status appropriately

**Pass Criteria:** ✅ If failure is logged and DB updated

---

### TC-005: Multiple References with Mixed Relevance

**Objective:** Verify filtering and display when some references are relevant, some aren't.

**Setup:**
1. Create blog brief
2. Add 3-5 reference URLs (mix of relevant and irrelevant content)

**Steps:**
1. Save brief → all references scrape + extract
2. Monitor logs for extraction completion of each
3. Navigate to Alignment step
4. Observe which references appear in alignment summary

**Expected Result:**
- Only references with `extractionStatus = 'success'` appear
- References marked `'irrelevant'` are hidden
- If ALL are irrelevant: message shows "Your reference URLs could not be turned into structured insights..."
- If SOME are relevant: only relevant ones appear in alignment
- Frontend displays only useful reference insights

**Pass Criteria:** ✅ If irrelevant references are filtered and message shows when none usable

---

### TC-006: No Relevant References Message

**Objective:** Verify user gets clear feedback when all references are irrelevant.

**Setup:**
1. Create blog brief
2. Add 2-3 references that are completely unrelated to brief topic

**Steps:**
1. Save brief → trigger scrape + extraction
2. All extractions return `status='irrelevant'`
3. Navigate to Alignment step

**Expected Result:**
- Frontend detects `referencesAnalysis = 'none_usable'`
- Displays message: "Your reference URLs could not be turned into structured insights (scrape or analysis did not yield usable content). The summary below is based on your brief only."
- Alignment summary is generated from brief alone (no reference data)

**Pass Criteria:** ✅ If message displays and summary is brief-only

---

## Test Execution

### Environment: Staging

**Requirements:**
- Staging deployment of latest main branch
- Backend logs accessible (tail or log viewer)
- Database query access (or API to check reference status)
- Browser with DevTools network throttling

### Test Runs

| TC | Status | Notes | Date | Tester |
|----|--------|-------|------|--------|
| TC-001 | ⏳ Pending | | | QA Engineer |
| TC-002 | ⏳ Pending | | | QA Engineer |
| TC-003 | ⏳ Pending | | | QA Engineer |
| TC-004 | ⏳ Pending | | | QA Engineer |
| TC-005 | ⏳ Pending | | | QA Engineer |
| TC-006 | ⏳ Pending | | | QA Engineer |

---

## Quality Gate Checklist

Before sign-off:

- [ ] TC-001: Polling survives single network blip
- [ ] TC-002: Polling stops after 5 consecutive errors
- [ ] TC-003: Extraction status updates in database
- [ ] TC-004: Extraction failures are logged clearly
- [ ] TC-005: Relevant/irrelevant references filtered correctly
- [ ] TC-006: "No relevant references" message displays
- [ ] No regressions in reference workflow
- [ ] No new console errors

## QA Sign-off Template

```markdown
## QA Sign-off

**Verified by:** QA Engineer  
**Date:** YYYY-MM-DD  
**Environment:** Staging  

### Test Results Summary
- TC-001: PASS / FAIL
- TC-002: PASS / FAIL
- TC-003: PASS / FAIL
- TC-004: PASS / FAIL
- TC-005: PASS / FAIL
- TC-006: PASS / FAIL

### Issues Found
[List any bugs discovered during testing]

### Regression Testing
- [x] Reference scraping still works
- [x] Brief creation unaffected
- [x] Alignment generation unaffected

**Status:** APPROVED - Ready for Done
```

## References

- **Ticket #67:** fix: reference card polling stops on transient network error
- **Ticket #69:** fix: reference extraction status not updating in database
- **PR #68:** Merged with polling fix
- **PR #70:** Merged with logging fix
