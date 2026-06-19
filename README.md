# Gangke Zhihui MVP

An AI-assisted vocational training assessment MVP for `XA-202603 | iFlytek | Teaching Practice and Job Skill Agent Development for High-Level Vocational Specialty Groups`.

The current demo completes a local closed loop:

Teacher task generation or sample loading -> rubric editing and publishing -> student mixed text/code submission -> AI or example scoring -> student feedback and resubmission comparison -> teacher review -> class ability dashboard.

Data is stored in browser `localStorage`. The MVP does not include database storage, real login, file upload, or code execution.

## Completed Scope

- Task 1: Workbench shell, teacher/student views, five navigation modules, and local state persistence.
- Task 2: Generate three-level training tasks from course material and job standards, with sample-task fallback when no DeepSeek key is configured.
- Task 3: Edit and publish five-dimension rubrics for all three tasks.
- Task 4: Select real student identity, recommend task level by historical average, view published tasks, submit mixed text/code content, show academic integrity notice, and persist submissions locally.
- Task 5: Server-side scoring proxy at `/api/score-submission`, example scoring fallback, student scoring feedback, and resubmission comparison.
- Task 6: Teacher review for submitted work and AI/example scoring, including editable dimension scores, deduction reasons, suggestions, and summary.
- Task 7: Class dashboard with student completion status, AI/example score, teacher review score, five-dimension class averages, weak-dimension analysis, and teaching advice.
- Task 8: DeepSeek environment example, structured API errors, complete demo-chain loading, and end-to-end validation.
- Audit fix pass: downstream state reset on task replacement, hardened `localStorage` normalization, scored-submission selection for teacher review, real lint guard, and stale placeholder copy removal.

## Tech Stack

- Next.js 16
- React 19
- TypeScript 6
- pnpm

## Local Development

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

Validation:

```bash
pnpm run build
pnpm run lint
```

`pnpm run lint` runs `scripts/lint.mjs`. It is a lightweight project guard that checks the lint script is not aliased to `next build`, prevents client/shared DeepSeek config leakage, blocks stale placeholder copy, and catches console debugging statements.

## DeepSeek Configuration

Copy `.env.example` to `.env.local` and fill values as needed:

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-v4-flash
```

Without `DEEPSEEK_API_KEY`, AI generation and AI scoring APIs return structured errors. The UI can still complete the full demo through sample tasks, example scoring, or the complete demo-chain loader.

## Demo Path

Fastest demo:

1. Open the app.
2. Click "载入完整演示".
3. Open "班级看板" and confirm tasks, submissions, scores, teacher review, and ability analysis are present.

Manual demo:

1. Teacher view: open "AI 生成实训" and generate or load three leveled tasks.
2. Open "评分量规", edit the five fixed dimensions, and publish all tasks.
3. Switch to student view and open "学生提交".
4. Select a student. The app recommends a task level by historical average: `<70` basic, `70-85` advanced, `>85` challenge.
5. Accept the academic integrity notice and submit mixed text/code content.
6. Run AI scoring, or load example scoring when no key/API is available.
7. Resubmit and compare total score, dimension scores, and feedback text.
8. Switch back to teacher view and open "评分结果" to select a scored submission and review dimension scores, deduction reasons, suggestions, and summary.
9. Open "班级看板" to view completion state, review-prioritized scores, five-dimension averages, weak dimensions, and teaching advice.

## Project Documents

- PRD: [outputs/gangke-zhihui-prd.md](outputs/gangke-zhihui-prd.md)
- Issue breakdown: [outputs/gangke-zhihui-issues.md](outputs/gangke-zhihui-issues.md)
- Task 8 delivery status: [outputs/task8-delivery-status.md](outputs/task8-delivery-status.md)
- Audit fix requirements: [outputs/audit-fix-requirements.md](outputs/audit-fix-requirements.md)

## Acceptance Screenshots

- Task 1: [outputs/task1-workbench.png](outputs/task1-workbench.png)
- Task 2: [outputs/task2-generated-tasks.png](outputs/task2-generated-tasks.png)
- Task 3: [outputs/task3-rubric-publish.png](outputs/task3-rubric-publish.png)
- Task 4: [outputs/task4-student-submission.png](outputs/task4-student-submission.png)
- Task 5: [outputs/task5-ai-feedback.png](outputs/task5-ai-feedback.png)
- Task 6: [outputs/task6-teacher-review.png](outputs/task6-teacher-review.png)
- Task 7: [outputs/task7-class-dashboard.png](outputs/task7-class-dashboard.png)
- Task 8: [outputs/task8-end-to-end.png](outputs/task8-end-to-end.png)
