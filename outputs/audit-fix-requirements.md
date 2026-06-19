# Audit Fix Requirements

## Background

The Task 5-8 delivery audit found that the demo loop worked, but several state and verification details needed to be formalized before the project could be treated as a stable MVP baseline. This document captures those repair requirements and their acceptance criteria for the `develop` branch.

## Selected Agents

Selected agents:
- `business-analyst`: convert the audit findings into implementation requirements and acceptance criteria.
- `documentation-engineer`: document the repair scope and validation evidence.
- `fullstack-developer`: verify the existing implementation and make only mandatory fixes if a gap remains.
- `qa-expert`: validate build, lint, API error paths, browser flow, and localStorage recovery.
- `reviewer`: independently audit the final branch against this document.

Skipped agents:
- `frontend-developer` / `backend-developer`: the repair scope is a single MVP state-flow slice and does not need separate implementation ownership.
- `security-auditor`: no auth, permissions, or new secret-handling behavior is introduced.
- Database or deployment agents: the MVP remains localStorage-only and local-demo focused.

## Requirements

### R1. Task Replacement Clears Downstream State

When the teacher loads sample tasks or generates a new task set, stale student and scoring state must be cleared.

Acceptance criteria:
- `studentSubmissions`, `scoreRecords`, `teacherReviews`, `selectedScoreRecordId`, and `selectedSubmissionTaskLevel` are reset.
- Scoring and review drafts do not continue to point at a previous task set.
- The published state reflects only the current complete three-task set.

### R2. localStorage Normalization Hardening

Persisted workbench state must be normalized before use so dirty or older localStorage data cannot corrupt the demo.

Acceptance criteria:
- Incomplete training tasks are discarded instead of treated as publishable.
- `tasksPublished` is true only when all three task levels are present.
- Invalid `selectedStudentId` falls back to an existing default student.
- Score totals are recomputed from normalized dimension scores instead of trusting persisted totals.
- Dimension scores remain clamped to their configured maximums.

### R3. Teacher Review Selects Scored Submissions

The teacher review page must support reviewing any scored submission, not only the currently selected student and currently recommended task.

Acceptance criteria:
- The scoring results module shows a list of scored submissions.
- Selecting a record updates the review panel to that student, task, submission, and AI/example score.
- Existing teacher reviews are visible and editable for their matching score record.
- Saving a review recalculates the total from the five dimensions.

### R4. Real Lint Guard

`pnpm run lint` must be a real project guard, not an alias for `next build`.

Acceptance criteria:
- The lint script fails if it is configured as `next build`.
- The lint script scans source files for stale placeholder copy, client-side DeepSeek secret leakage, and console debugging statements.
- The lint command passes on the clean branch.

### R5. Remove Stale Placeholder Copy

User-facing copy must no longer describe implemented modules as future placeholders.

Acceptance criteria:
- The old placeholder phrase is not present in user-facing source.
- Navigation/status copy describes the current implemented MVP flow.
- Lint guards against reintroducing the stale placeholder phrase.

## Validation Plan

Required commands:

```bash
pnpm run lint
pnpm run build
```

Required API checks:
- `POST /api/generate-training-tasks` with empty input returns a structured `MISSING_INPUT` error.
- `POST /api/score-submission` with empty input returns a structured `MISSING_INPUT` error.
- With no `DEEPSEEK_API_KEY`, the UI can still complete the scoring path through example scoring.

Required browser checks:
- Clear localStorage.
- Load the complete sample chain.
- Publish rubrics.
- Submit mixed text and code as a student.
- Load example scoring when AI scoring is unavailable.
- Submit again and verify before/after comparison is shown.
- Review the score as a teacher.
- Confirm the class dashboard reflects the reviewed score.
- Refresh and confirm persisted state restores.
- Inject dirty localStorage and confirm normalization recovers to a usable state.

## Current Implementation Status

The current `develop` branch is based on `origin/main` at commit `b9c0f9b`, which already contained most prior audit fixes. The `develop` verification pass found and fixed one mandatory R3 gap: selecting an older scored submission now resolves `currentScoreRecord` by `selectedScoreRecordId` before falling back to the latest attempt. The pass also replaced stale fallback placeholder copy and expanded the lint guard to block those phrases.

## Validation Results

Validated on 2026-06-19:

- `pnpm run lint`: passed with `lint passed (8 files checked)`.
- `pnpm run build`: passed with Next.js production build and TypeScript checks.
- `POST /api/generate-training-tasks` empty body: returned `400 MISSING_INPUT`.
- `POST /api/score-submission` empty body: returned `400 MISSING_INPUT`.
- `POST /api/score-submission` valid body without `DEEPSEEK_API_KEY`: returned `503 MISSING_DEEPSEEK_KEY`.
- Browser demo after clearing localStorage: complete demo loaded 3 tasks, 2 submissions, 2 score records, 1 teacher review, and published state.
- Scored-submission selection: persisted selected score record is shown in the scoring results page.
- Refresh recovery: score records, teacher reviews, and published state persisted.
- Dirty localStorage recovery: invalid selected student fell back to `stu-001`, incomplete tasks were discarded, `tasksPublished` became false, invalid selected score record fell back to a valid record, and dirty score totals were recomputed.
- Screenshot: `outputs/develop-audit-fix-validation.png`.
