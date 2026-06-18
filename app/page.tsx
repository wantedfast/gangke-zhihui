"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createExampleScoreRecord,
  defaultWorkbenchState,
  sampleTrainingTasks,
} from "@/lib/sample-data";
import { readWorkbenchState, writeWorkbenchState } from "@/lib/workbench-storage";
import type {
  EditableRubricField,
  NavKey,
  Perspective,
  RubricDimension,
  ScoreDimensionResult,
  ScoreRecord,
  Student,
  TeacherReview,
  TrainingTask,
  WorkbenchState,
} from "@/types/workbench";
import { RUBRIC_DIMENSIONS, TASK_LEVELS } from "@/types/workbench";

const navItems: Array<{ key: NavKey; label: string; helper: string }> = [
  { key: "ai-workbench", label: "AI 生成实训", helper: "课程资料与岗位标准" },
  { key: "rubric", label: "评分量规", helper: "教师编辑与本地发布" },
  { key: "submissions", label: "学生提交", helper: "后续切片接入" },
  { key: "results", label: "评分结果", helper: "AI 反馈与教师复核" },
  { key: "class-dashboard", label: "班级看板", helper: "能力均值与薄弱项" },
];

const navContent: Record<NavKey, { title: string; description: string }> = {
  "ai-workbench": {
    title: "AI 生成实训工作台",
    description:
      "先生成或加载三道实训任务，再进入评分量规页编辑五个固定维度并统一发布。",
  },
  rubric: {
    title: "教师评分量规编辑",
    description:
      "五个维度固定为 20 / 25 / 25 / 20 / 10 分，教师可编辑每一维的评分要点、优秀标准、及格标准和扣分点。",
  },
  submissions: {
    title: "学生提交",
    description:
      "学生选择身份后查看已发布任务，根据历史平均分获得推荐任务，并提交文本与代码混合内容。",
  },
  results: {
    title: "评分结果",
    description:
      "学生提交后可触发 AI 或示例评分，教师可在同一模块复核五维分数并保存结果。",
  },
  "class-dashboard": {
    title: "班级能力看板",
    description:
      "基于复核结果优先、AI 评分兜底的班级数据，展示完成状态、能力均值和薄弱项建议。",
  },
};

const rubricFieldMeta: Array<{
  field: EditableRubricField;
  label: string;
  placeholder: string;
}> = [
  {
    field: "criteria",
    label: "评分要点",
    placeholder: "说明这一维度主要评什么。",
  },
  {
    field: "excellentStandard",
    label: "优秀标准",
    placeholder: "说明达到优秀需要满足的表现。",
  },
  {
    field: "passStandard",
    label: "及格标准",
    placeholder: "说明达到及格线的最低要求。",
  },
  {
    field: "deductionPoint",
    label: "扣分点",
    placeholder: "列出常见问题、遗漏项或风险点。",
  },
];

function recommendLevel(student: Student | undefined): TrainingTask["level"] {
  const average = student?.historicalAverage ?? 0;
  if (average < 70) {
    return "基础";
  }
  if (average <= 85) {
    return "进阶";
  }
  return "挑战";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未提交";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function hasFullTaskSet(tasks: TrainingTask[]) {
  return (
    tasks.length === TASK_LEVELS.length &&
    tasks.every((task) => task.rubric.length === RUBRIC_DIMENSIONS.length)
  );
}

function formatPublishedAt(publishedAt: string | null) {
  if (!publishedAt) {
    return "未发布";
  }

  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return "未发布";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDraftPublicationPatch(state: WorkbenchState) {
  if (!state.tasksPublished && !state.publishedAt) {
    return {};
  }

  return {
    tasksPublished: false,
    publishedAt: null,
  };
}

function getScoreTotal(record: ScoreRecord, review: TeacherReview | null) {
  return review?.totalScore ?? record.result.totalScore;
}

function readApiErrorMessage(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.trim()
  ) {
    return value.message;
  }

  return fallback;
}

export default function Home() {
  const [state, setState] = useState<WorkbenchState>(defaultWorkbenchState);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [isScoring, setIsScoring] = useState(false);
  const [scoringError, setScoringError] = useState("");
  const [reviewDraft, setReviewDraft] = useState<TeacherReview | null>(null);

  useEffect(() => {
    setState(readWorkbenchState());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) {
      writeWorkbenchState(state);
    }
  }, [isReady, state]);

  const selectedStudent = useMemo(
    () =>
      state.students.find((student) => student.id === state.selectedStudentId) ??
      state.students[0],
    [state.selectedStudentId, state.students],
  );

  const activeContent = navContent[state.activeNav];
  const isTeacher = state.perspective === "teacher";
  const hasTrainingTasks = state.trainingTasks.length > 0;
  const canPublish = isTeacher && hasFullTaskSet(state.trainingTasks);
  const publishedText = formatPublishedAt(state.publishedAt);
  const recommendedLevel = recommendLevel(selectedStudent);
  const recommendedTask =
    state.trainingTasks.find((task) => task.level === recommendedLevel) ??
    state.trainingTasks[0];
  const selectedSubmissionTask =
    state.trainingTasks.find(
      (task) =>
        task.level === (state.selectedSubmissionTaskLevel ?? recommendedLevel),
    ) ?? recommendedTask;
  const selectedSubmission = state.studentSubmissions.find(
    (submission) =>
      submission.studentId === state.selectedStudentId &&
      submission.taskLevel === selectedSubmissionTask?.level,
  );
  const selectedScoreRecords = state.scoreRecords
    .filter(
      (record) =>
        record.studentId === state.selectedStudentId &&
        record.taskLevel === selectedSubmissionTask?.level,
    )
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
  const currentScoreRecord =
    selectedScoreRecords[selectedScoreRecords.length - 1] ?? null;
  const previousScoreRecord =
    selectedScoreRecords.length > 1
      ? selectedScoreRecords[selectedScoreRecords.length - 2]
      : null;
  const currentTeacherReview = currentScoreRecord
    ? state.teacherReviews.find(
        (review) => review.scoreRecordId === currentScoreRecord.id,
      ) ?? null
    : null;

  useEffect(() => {
    setReviewDraft(null);
  }, [currentScoreRecord?.id]);

  function updateState(patch: Partial<WorkbenchState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updateDraft(field: keyof WorkbenchState["draftInputs"], value: string) {
    setState((current) => ({
      ...current,
      draftInputs: {
        ...current.draftInputs,
        [field]: value,
      },
    }));
  }

  function selectStudent(studentId: string) {
    setState((current) => {
      const nextStudent =
        current.students.find((student) => student.id === studentId) ??
        current.students[0];
      const nextLevel = recommendLevel(nextStudent);
      const savedSubmission = current.studentSubmissions.find(
        (submission) =>
          submission.studentId === nextStudent?.id &&
          submission.taskLevel === nextLevel,
      );

      return {
        ...current,
        selectedStudentId: studentId,
        selectedSubmissionTaskLevel: nextLevel,
        draftInputs: {
          ...current.draftInputs,
          studentSubmission:
            savedSubmission?.content ??
            defaultWorkbenchState.draftInputs.studentSubmission,
        },
      };
    });
  }

  function resetSampleData() {
    setGenerationError("");
    setState(defaultWorkbenchState);
  }

  function loadSampleTasks() {
    setGenerationError("");
    setState((current) => ({
      ...current,
      sampleLoaded: true,
      trainingTasks: sampleTrainingTasks,
      tasksPublished: false,
      publishedAt: null,
    }));
  }

  function loadFullDemoChain() {
    const now = new Date().toISOString();
    const demoStudents = state.students.length
      ? state.students
      : defaultWorkbenchState.students;
    const firstStudent = demoStudents[0];
    const secondStudent = demoStudents[1] ?? firstStudent;
    const basicTask = sampleTrainingTasks[0];
    const advancedTask = sampleTrainingTasks[1] ?? basicTask;
    const firstSubmission = {
      id: `${firstStudent.id}-${basicTask.level}-demo-submission`,
      studentId: firstStudent.id,
      taskLevel: basicTask.level,
      content:
        "第一版提交：完成岗位能力矩阵，补充模型接口调用伪代码，并说明数据脱敏和人工复核流程。",
      submittedAt: now,
    };
    const secondSubmission = {
      id: `${secondStudent.id}-${advancedTask.level}-demo-submission`,
      studentId: secondStudent.id,
      taskLevel: advancedTask.level,
      content:
        "进阶提交：设计校园问答助手流程，包含检索、模型调用、失败兜底和效果评估指标。",
      submittedAt: now,
    };
    const firstScore = createExampleScoreRecord(
      firstStudent,
      basicTask,
      firstSubmission,
      1,
    );
    const secondScore = createExampleScoreRecord(
      secondStudent,
      advancedTask,
      secondSubmission,
      1,
    );
    const reviewDimensions = firstScore.result.dimensions.map((dimension) => ({
      ...dimension,
      score:
        dimension.dimension === "岗位需求分析"
          ? Math.max(0, dimension.score - 1)
          : dimension.score,
      deductionReason:
        dimension.dimension === "岗位需求分析"
          ? "教师复核：岗位证据链还可以继续补充。"
          : dimension.deductionReason,
      suggestion:
        dimension.dimension === "岗位需求分析"
          ? "补充 1-2 条岗位标准原文，并标注对应能力点。"
          : dimension.suggestion,
    }));
    const teacherReview = {
      id: `${firstScore.id}-teacher-review`,
      scoreRecordId: firstScore.id,
      studentId: firstStudent.id,
      taskLevel: basicTask.level,
      reviewedAt: now,
      dimensions: reviewDimensions,
      totalScore: reviewDimensions.reduce(
        (sum, dimension) => sum + dimension.score,
        0,
      ),
      summary:
        "教师复核：整体达到发布标准，岗位需求分析还需补充更明确的岗位标准引用。",
    };

    setGenerationError("");
    setScoringError("");
    setReviewDraft(null);
    setState({
      ...defaultWorkbenchState,
      perspective: "teacher",
      activeNav: "class-dashboard",
      sampleLoaded: true,
      students: demoStudents,
      selectedStudentId: firstStudent.id,
      selectedSubmissionTaskLevel: basicTask.level,
      trainingTasks: sampleTrainingTasks,
      tasksPublished: true,
      publishedAt: now,
      studentSubmissions: [firstSubmission, secondSubmission],
      scoreRecords: [firstScore, secondScore],
      teacherReviews: [teacherReview],
      selectedScoreRecordId: firstScore.id,
      draftInputs: {
        ...defaultWorkbenchState.draftInputs,
        studentSubmission: firstSubmission.content,
      },
    });
  }

  function updateRubricField(
    taskLevel: TrainingTask["level"],
    dimension: RubricDimension,
    field: EditableRubricField,
    value: string,
  ) {
    setState((current) => ({
      ...current,
      ...getDraftPublicationPatch(current),
      trainingTasks: current.trainingTasks.map((task) =>
        task.level !== taskLevel
          ? task
          : {
              ...task,
              rubric: task.rubric.map((item) =>
                item.dimension !== dimension ? item : { ...item, [field]: value },
              ),
            },
      ),
    }));
  }

  function publishTasks() {
    if (!canPublish) {
      return;
    }

    setState((current) => ({
      ...current,
      tasksPublished: true,
      publishedAt: new Date().toISOString(),
    }));
  }

  function updateStudentSubmissionDraft(value: string) {
    updateDraft("studentSubmission", value);
  }

  function submitStudentWork() {
    if (!selectedStudent || !selectedSubmissionTask) {
      return;
    }

    const content = state.draftInputs.studentSubmission;
    if (!content.trim()) {
      return;
    }

    setState((current) => {
      const nextSubmission = {
        id: `${selectedStudent.id}-${selectedSubmissionTask.level}`,
        studentId: selectedStudent.id,
        taskLevel: selectedSubmissionTask.level,
        content,
        submittedAt: new Date().toISOString(),
      };

      return {
        ...current,
        studentSubmissions: [
          ...current.studentSubmissions.filter(
            (submission) =>
              !(
                submission.studentId === nextSubmission.studentId &&
                submission.taskLevel === nextSubmission.taskLevel
              ),
          ),
          nextSubmission,
        ],
      };
    });
  }

  function appendScoreRecord(record: ScoreRecord) {
    setState((current) => ({
      ...current,
      selectedScoreRecordId: record.id,
      scoreRecords: [...current.scoreRecords, record],
    }));
  }

  function nextAttemptNumber(studentId: string, taskLevel: TrainingTask["level"]) {
    return (
      state.scoreRecords.filter(
        (record) => record.studentId === studentId && record.taskLevel === taskLevel,
      ).length + 1
    );
  }

  async function scoreSelectedSubmission() {
    if (!selectedStudent || !selectedSubmissionTask || !selectedSubmission) {
      setScoringError("请先保存学生提交内容，再进行评分。");
      return;
    }

    setIsScoring(true);
    setScoringError("");

    try {
      const response = await fetch("/api/score-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: selectedSubmissionTask,
          student: selectedStudent,
          submissionContent: selectedSubmission.content,
        }),
      });
      const payload = (await response.json()) as {
        result?: ScoreRecord["result"];
        error?: unknown;
      };

      if (!response.ok || !payload.result) {
        throw new Error(readApiErrorMessage(payload.error, "AI 评分失败，请稍后重试。"));
      }

      appendScoreRecord({
        id: `${selectedSubmission.id}-ai-score-${Date.now()}`,
        studentId: selectedStudent.id,
        taskLevel: selectedSubmissionTask.level,
        submissionId: selectedSubmission.id,
        submissionContent: selectedSubmission.content,
        attemptNumber: nextAttemptNumber(selectedStudent.id, selectedSubmissionTask.level),
        scoredAt: new Date().toISOString(),
        source: "ai",
        result: payload.result,
      });
    } catch (error) {
      setScoringError(
        error instanceof Error ? error.message : "AI 评分失败，请加载示例评分。",
      );
    } finally {
      setIsScoring(false);
    }
  }

  function loadExampleScore() {
    if (!selectedStudent || !selectedSubmissionTask || !selectedSubmission) {
      setScoringError("请先保存学生提交内容，再加载示例评分。");
      return;
    }

    const record = createExampleScoreRecord(
      selectedStudent,
      selectedSubmissionTask,
      selectedSubmission,
      nextAttemptNumber(selectedStudent.id, selectedSubmissionTask.level),
    );
    setScoringError("");
    appendScoreRecord(record);
  }

  function selectSubmissionTask(taskLevel: TrainingTask["level"]) {
    setState((current) => {
      const savedSubmission = current.studentSubmissions.find(
        (submission) =>
          submission.studentId === current.selectedStudentId &&
          submission.taskLevel === taskLevel,
      );

      return {
        ...current,
        selectedSubmissionTaskLevel: taskLevel,
        draftInputs: {
          ...current.draftInputs,
          studentSubmission:
            savedSubmission?.content ??
            defaultWorkbenchState.draftInputs.studentSubmission,
        },
      };
    });
  }

  function createReviewDraft(record: ScoreRecord): TeacherReview {
    const existingReview = state.teacherReviews.find(
      (review) => review.scoreRecordId === record.id,
    );
    const dimensions = (existingReview?.dimensions ?? record.result.dimensions).map(
      (dimension) => ({ ...dimension }),
    );

    return {
      id: existingReview?.id ?? `${record.id}-teacher-review`,
      scoreRecordId: record.id,
      studentId: record.studentId,
      taskLevel: record.taskLevel,
      reviewedAt: existingReview?.reviewedAt ?? new Date().toISOString(),
      dimensions,
      totalScore: dimensions.reduce((sum, dimension) => sum + dimension.score, 0),
      summary: existingReview?.summary ?? record.result.summary,
    };
  }

  function updateReviewDimension(
    dimensionName: RubricDimension,
    patch: Partial<ScoreDimensionResult>,
  ) {
    setReviewDraft((current) => {
      if (!current) {
        return current;
      }

      const dimensions = current.dimensions.map((dimension) => {
        if (dimension.dimension !== dimensionName) {
          return dimension;
        }

        const nextScore =
          typeof patch.score === "number"
            ? Math.max(0, Math.min(dimension.maxScore, Math.round(patch.score)))
            : dimension.score;

        return {
          ...dimension,
          ...patch,
          score: nextScore,
        };
      });

      return {
        ...current,
        dimensions,
        totalScore: dimensions.reduce((sum, dimension) => sum + dimension.score, 0),
      };
    });
  }

  function saveTeacherReview() {
    if (!reviewDraft) {
      return;
    }

    const nextReview = {
      ...reviewDraft,
      reviewedAt: new Date().toISOString(),
      totalScore: reviewDraft.dimensions.reduce(
        (sum, dimension) => sum + dimension.score,
        0,
      ),
    };

    setState((current) => ({
      ...current,
      teacherReviews: [
        ...current.teacherReviews.filter(
          (review) => review.scoreRecordId !== nextReview.scoreRecordId,
        ),
        nextReview,
      ],
    }));
    setReviewDraft(nextReview);
  }

  async function generateTrainingTasks() {
    const courseMaterial = state.draftInputs.courseMaterial.trim();
    const jobStandard = state.draftInputs.jobStandard.trim();

    if (!courseMaterial || !jobStandard) {
      setGenerationError("请先填写课程资料和岗位标准。");
      return;
    }

    setIsGenerating(true);
    setGenerationError("");

    try {
      const response = await fetch("/api/generate-training-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseMaterial, jobStandard }),
      });
      const payload = (await response.json()) as {
        tasks?: TrainingTask[];
        error?: unknown;
      };
      const tasks = payload.tasks;

      if (!response.ok || !tasks) {
        throw new Error(readApiErrorMessage(payload.error, "生成分层任务失败，请稍后重试。"));
      }

      setState((current) => ({
        ...current,
        sampleLoaded: false,
        trainingTasks: tasks,
        tasksPublished: false,
        publishedAt: null,
      }));
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "生成分层任务失败，请稍后重试。",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function renderTaskOverview() {
    return (
      <section className="glass-panel task-panel" aria-live="polite">
        <div className="section-title">
          <h3>分层实训任务</h3>
          <span>{state.sampleLoaded ? "示例任务" : "AI 任务草案"}</span>
        </div>

        {generationError ? (
          <div className="error-box">
            <p>{generationError}</p>
            <button type="button" onClick={loadSampleTasks}>
              加载示例任务
            </button>
          </div>
        ) : null}

        {!hasTrainingTasks ? (
          <div className="empty-state">
            <p>填写课程资料和岗位标准后生成三道任务，或直接加载示例任务继续编辑评分量规。</p>
          </div>
        ) : (
          <div className="task-grid">
            {state.trainingTasks.map((task) => (
              <article className="task-card" key={task.level}>
                <div className="task-card-header">
                  <span>{task.level}</span>
                  <h4>{task.title}</h4>
                </div>
                <dl>
                  <div>
                    <dt>任务目标</dt>
                    <dd>{task.objective}</dd>
                  </div>
                  <div>
                    <dt>任务描述</dt>
                    <dd>{task.description}</dd>
                  </div>
                  <div>
                    <dt>提交要求</dt>
                    <dd>{task.submissionRequirements}</dd>
                  </div>
                  <div>
                    <dt>评价重点</dt>
                    <dd>{task.evaluationFocus}</dd>
                  </div>
                </dl>
                <div className="rubric-list">
                  <h5>量规摘要</h5>
                  {task.rubric.map((item) => (
                    <div className="rubric-row" key={item.dimension}>
                      <strong>
                        {item.dimension} · {item.score} 分
                      </strong>
                      <span>{item.criteria || "待教师补充评分要点。"}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  function renderRubricEditor() {
    return (
      <section className="glass-panel task-panel" aria-live="polite">
        <div className="section-title">
          <h3>教师评分量规</h3>
          <span>发布仅保存到当前浏览器 localStorage</span>
        </div>

        {!hasTrainingTasks ? (
          <div className="empty-state rubric-empty">
            <p>当前没有可编辑的评分量规。请先生成或加载三道实训任务，再回来发布全部任务。</p>
            <div className="inline-actions">
              <button className="secondary-button" type="button" onClick={loadSampleTasks}>
                加载示例任务
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => updateState({ activeNav: "ai-workbench" })}
              >
                返回任务生成
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="publish-bar">
              <div>
                <p className="context-label">量规发布</p>
                <h4>三道任务统一发布</h4>
                <p className="helper-text">
                  固定维度与固定分值已锁定。重新生成任务或编辑任一字段后，已发布状态会自动回到草稿。
                </p>
              </div>
              <div className="publish-meta">
                <span
                  className={
                    state.tasksPublished
                      ? "status-badge published"
                      : "status-badge draft"
                  }
                >
                  {state.tasksPublished ? "已发布" : "草稿"}
                </span>
                <p>{state.tasksPublished ? `发布时间：${publishedText}` : "尚未发布到本地浏览器。"}</p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={publishTasks}
                  disabled={!canPublish}
                >
                  发布全部任务
                </button>
              </div>
            </div>

            {!isTeacher ? (
              <div className="readonly-tip">
                当前为学生视角，评分量规只读。切回教师视角后可继续编辑和发布。
              </div>
            ) : null}

            <div className="rubric-task-grid">
              {state.trainingTasks.map((task) => (
                <article className="rubric-task-card" key={task.level}>
                  <div className="task-card-header rubric-task-header">
                    <span>{task.level}</span>
                    <div>
                      <h4>{task.title}</h4>
                      <p>{task.objective}</p>
                    </div>
                  </div>

                  <div className="rubric-task-meta">
                    <p>
                      <strong>提交要求：</strong>
                      {task.submissionRequirements}
                    </p>
                    <p>
                      <strong>评价重点：</strong>
                      {task.evaluationFocus}
                    </p>
                  </div>

                  <div className="rubric-editor-list">
                    {task.rubric.map((item) => (
                      <section className="rubric-dimension-card" key={item.dimension}>
                        <div className="rubric-dimension-header">
                          <div>
                            <h5>{item.dimension}</h5>
                            <p>{item.score} 分固定权重</p>
                          </div>
                          <span className="rubric-score">5 个固定维度之一</span>
                        </div>

                        <div className="rubric-field-grid">
                          {rubricFieldMeta.map((fieldMeta) => (
                            <label key={fieldMeta.field}>
                              {fieldMeta.label}
                              <textarea
                                value={item[fieldMeta.field]}
                                onChange={(event) =>
                                  updateRubricField(
                                    task.level,
                                    item.dimension,
                                    fieldMeta.field,
                                    event.target.value,
                                  )
                                }
                                placeholder={fieldMeta.placeholder}
                                disabled={!isTeacher}
                              />
                            </label>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    );
  }

  function renderStudentSubmission() {
    return (
      <section className="glass-panel task-panel student-submission-panel">
        <div className="section-title">
          <h3>学生任务提交</h3>
          <span>提交内容仅保存到当前浏览器 localStorage</span>
        </div>

        {!state.tasksPublished || !selectedSubmissionTask ? (
          <div className="empty-state rubric-empty">
            <p>老师尚未发布三道实训任务。请先在教师端完成评分量规发布，再回到学生端提交作业。</p>
            <div className="inline-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  updateState({ perspective: "teacher", activeNav: "rubric" })
                }
              >
                前往教师发布
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="student-work-header">
              <div className="identity-card">
                <p className="context-label">当前学生</p>
                <h4>{selectedStudent?.name ?? "未选择学生"}</h4>
                <p>
                  {selectedStudent?.group ?? "未分组"} · 历史平均分{" "}
                  <strong>{selectedStudent?.historicalAverage ?? 0}</strong>
                </p>
              </div>
              <div className="recommend-card">
                <p className="context-label">推荐规则</p>
                <h4>{recommendedLevel}</h4>
                <p>{"<70 基础，70-85 进阶，>85 挑战"}</p>
              </div>
              <div className="submission-state-card">
                <p className="context-label">提交状态</p>
                <h4>{selectedSubmission ? "已提交" : "未提交"}</h4>
                <p>{selectedSubmission ? formatDateTime(selectedSubmission.submittedAt) : "等待提交"}</p>
              </div>
            </div>

            <div className="student-task-chooser">
              {state.trainingTasks.map((task) => {
                const isRecommended = task.level === recommendedLevel;
                const isSelected = task.level === selectedSubmissionTask.level;

                return (
                  <button
                    className={
                      isSelected
                        ? "student-task-choice selected"
                        : "student-task-choice"
                    }
                    key={task.level}
                    type="button"
                    onClick={() => selectSubmissionTask(task.level)}
                  >
                    <span>{task.level}</span>
                    <strong>{task.title}</strong>
                    <small>{isRecommended ? "推荐任务" : "可选任务"}</small>
                  </button>
                );
              })}
            </div>

            <article className="student-task-card">
              <div className="task-card-header">
                <span>{selectedSubmissionTask.level}</span>
                <h4>{selectedSubmissionTask.title}</h4>
              </div>
              <div className="student-task-detail">
                <p>
                  <strong>任务目标：</strong>
                  {selectedSubmissionTask.objective}
                </p>
                <p>
                  <strong>任务描述：</strong>
                  {selectedSubmissionTask.description}
                </p>
                <p>
                  <strong>提交要求：</strong>
                  {selectedSubmissionTask.submissionRequirements}
                </p>
              </div>
            </article>

            <div className="integrity-box">
              <strong>学术诚信提示</strong>
              <p>
                可以使用 AI 辅助梳理思路，但必须保留自己的分析、关键代码和验证过程。请在提交中说明 AI 辅助范围，禁止直接粘贴无法解释的生成内容。
              </p>
            </div>

            <label className="submission-editor">
              文本 + 代码混合提交
              <textarea
                value={state.draftInputs.studentSubmission}
                onChange={(event) => updateStudentSubmissionDraft(event.target.value)}
                placeholder={"在这里粘贴方案说明、关键代码、测试记录和 AI 使用说明。"}
              />
            </label>

            <div className="generation-actions">
              <button
                className="primary-button"
                type="button"
                onClick={submitStudentWork}
                disabled={!state.draftInputs.studentSubmission.trim()}
              >
                保存提交
              </button>
            </div>

            {selectedSubmission ? (
              <div className="last-submission">
                <div className="section-title">
                  <h3>最近提交</h3>
                  <span>{formatDateTime(selectedSubmission.submittedAt)}</span>
                </div>
                <pre>{selectedSubmission.content}</pre>
              </div>
            ) : null}

            <div className="score-action-panel">
              <div>
                <p className="context-label">AI 评分</p>
                <h4>{currentScoreRecord ? "已有评分结果" : "等待评分"}</h4>
                <p>
                  评分会读取当前已保存提交、任务说明和五维量规。未配置 DeepSeek 时，可加载示例评分继续演示。
                </p>
              </div>
              <div className="generation-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={scoreSelectedSubmission}
                  disabled={!selectedSubmission || isScoring}
                >
                  {isScoring ? "评分中..." : "AI 评分"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={loadExampleScore}
                  disabled={!selectedSubmission}
                >
                  加载示例评分
                </button>
              </div>
            </div>

            {scoringError ? (
              <div className="error-box">
                <p>{scoringError}</p>
                <button type="button" onClick={loadExampleScore}>
                  加载示例评分
                </button>
              </div>
            ) : null}

            {currentScoreRecord ? renderScoreResult(currentScoreRecord, previousScoreRecord) : null}
          </>
        )}
      </section>
    );
  }

  function getDimensionDelta(
    current: ScoreDimensionResult,
    previous: ScoreRecord | null,
  ) {
    const previousDimension = previous?.result.dimensions.find(
      (dimension) => dimension.dimension === current.dimension,
    );
    return previousDimension ? current.score - previousDimension.score : null;
  }

  function renderScoreResult(record: ScoreRecord, previous: ScoreRecord | null) {
    const totalDelta = previous
      ? record.result.totalScore - previous.result.totalScore
      : null;

    return (
      <article className="score-result-card">
        <div className="score-result-header">
          <div>
            <p className="context-label">
              {record.source === "ai" ? "AI 评分结果" : "示例评分结果"}
            </p>
            <h4>{record.result.totalScore} 分</h4>
            <p>
              第 {record.attemptNumber} 次评分 · {formatDateTime(record.scoredAt)}
            </p>
          </div>
          {totalDelta !== null ? (
            <span className={totalDelta >= 0 ? "delta-badge up" : "delta-badge down"}>
              较上次 {totalDelta >= 0 ? "+" : ""}
              {totalDelta} 分
            </span>
          ) : (
            <span className="delta-badge">首次评分</span>
          )}
        </div>

        <div className="score-dimension-grid">
          {record.result.dimensions.map((dimension) => {
            const previousDimension = previous?.result.dimensions.find(
              (item) => item.dimension === dimension.dimension,
            );
            const delta = getDimensionDelta(dimension, previous);
            return (
              <section className="score-dimension-card" key={dimension.dimension}>
                <div className="score-dimension-title">
                  <strong>{dimension.dimension}</strong>
                  <span>
                    {dimension.score}/{dimension.maxScore}
                    {delta !== null ? `（${delta >= 0 ? "+" : ""}${delta}）` : ""}
                  </span>
                </div>
                <p>
                  <b>扣分原因：</b>
                  {dimension.deductionReason}
                </p>
                <p>
                  <b>改进建议：</b>
                  {dimension.suggestion}
                </p>
                {previousDimension &&
                (previousDimension.deductionReason !== dimension.deductionReason ||
                  previousDimension.suggestion !== dimension.suggestion) ? (
                  <div className="score-change-note">
                    <span>上次反馈</span>
                    <p>{previousDimension.deductionReason}</p>
                    <p>{previousDimension.suggestion}</p>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        {previous && previous.result.summary !== record.result.summary ? (
          <div className="score-change-note wide">
            <span>上次总评</span>
            <p>{previous.result.summary}</p>
          </div>
        ) : null}

        <div className="score-summary">
          <strong>总评</strong>
          <p>{record.result.summary}</p>
        </div>
      </article>
    );
  }

  function renderTeacherReviewPanel(record: ScoreRecord) {
    const activeReviewDraft = reviewDraft;
    const savedReview = currentTeacherReview;
    const displayReview = activeReviewDraft ?? savedReview;

    return (
      <article className="score-result-card teacher-review-panel">
        <div className="score-result-header">
          <div>
            <p className="context-label">教师复核</p>
            <h4>{displayReview ? `${displayReview.totalScore} 分` : "待复核"}</h4>
            <p>
              {savedReview
                ? `已保存 · ${formatDateTime(savedReview.reviewedAt)}`
                : "基于当前 AI / 示例评分进行人工确认"}
            </p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setReviewDraft(createReviewDraft(record))}
          >
            {savedReview ? "继续复核" : "开始复核"}
          </button>
        </div>

        <div className="review-context-grid">
          <div>
            <span>学生</span>
            <strong>{selectedStudent?.name ?? record.studentId}</strong>
            <p>{selectedStudent?.group ?? "未匹配班级"}</p>
          </div>
          <div>
            <span>任务</span>
            <strong>{selectedSubmissionTask?.title ?? record.taskLevel}</strong>
            <p>{record.taskLevel}</p>
          </div>
          <div>
            <span>提交内容</span>
            <p>{record.submissionContent}</p>
          </div>
        </div>

        {activeReviewDraft ? (
          <>
            <div className="review-editor-grid">
              {activeReviewDraft.dimensions.map((dimension) => (
                <section className="review-dimension-editor" key={dimension.dimension}>
                  <label>
                    <span>{dimension.dimension}</span>
                    <input
                      max={dimension.maxScore}
                      min={0}
                      onChange={(event) =>
                        updateReviewDimension(dimension.dimension, {
                          score: Number(event.target.value),
                        })
                      }
                      type="number"
                      value={dimension.score}
                    />
                    <small>/{dimension.maxScore}</small>
                  </label>
                  <textarea
                    onChange={(event) =>
                      updateReviewDimension(dimension.dimension, {
                        deductionReason: event.target.value,
                      })
                    }
                    rows={3}
                    value={dimension.deductionReason}
                  />
                  <textarea
                    onChange={(event) =>
                      updateReviewDimension(dimension.dimension, {
                        suggestion: event.target.value,
                      })
                    }
                    rows={3}
                    value={dimension.suggestion}
                  />
                </section>
              ))}
            </div>

            <label className="review-summary-editor">
              <span>教师总评</span>
              <textarea
                onChange={(event) =>
                  setReviewDraft((current) =>
                    current ? { ...current, summary: event.target.value } : current,
                  )
                }
                rows={4}
                value={activeReviewDraft.summary}
              />
            </label>

            <div className="inline-actions">
              <button className="primary-button" onClick={saveTeacherReview} type="button">
                保存复核
              </button>
              <button
                className="secondary-button"
                onClick={() => setReviewDraft(null)}
                type="button"
              >
                取消
              </button>
            </div>
          </>
        ) : savedReview ? (
          <div className="review-saved-grid">
            {savedReview.dimensions.map((dimension) => (
              <div key={dimension.dimension}>
                <span>{dimension.dimension}</span>
                <strong>
                  {dimension.score}/{dimension.maxScore}
                </strong>
                <p>{dimension.deductionReason}</p>
                <p>{dimension.suggestion}</p>
              </div>
            ))}
            <div className="score-summary">
              <strong>教师总评</strong>
              <p>{savedReview.summary}</p>
            </div>
          </div>
        ) : (
          <p className="muted-note">
            复核保存后会写入 localStorage，并作为后续班级看板的数据源。
          </p>
        )}
      </article>
    );
  }

  function renderScoreResultsPage() {
    if (!currentScoreRecord) {
      return (
        <section className="glass-panel task-panel placeholder-panel">
          <div className="section-title">
            <h3>评分结果</h3>
            <span>等待学生评分</span>
          </div>
          <p>当前学生和任务还没有评分记录。请先在学生提交页保存作业并触发 AI 评分，或加载示例评分。</p>
        </section>
      );
    }

    return (
      <section className="glass-panel task-panel student-submission-panel">
        <div className="section-title">
          <h3>评分结果</h3>
          <span>{selectedStudent?.name ?? "当前学生"} · {selectedSubmissionTask?.level ?? "任务"}</span>
        </div>
        {renderScoreResult(currentScoreRecord, previousScoreRecord)}
        {isTeacher ? renderTeacherReviewPanel(currentScoreRecord) : null}
      </section>
    );
  }

  function renderClassDashboard() {
    const reviewedByScoreId = new Map(
      state.teacherReviews.map((review) => [review.scoreRecordId, review]),
    );
    const latestRecordByStudentTask = new Map<string, ScoreRecord>();
    const submissionByStudentTask = new Map(
      state.studentSubmissions.map((submission) => [
        `${submission.studentId}:${submission.taskLevel}`,
        submission,
      ]),
    );

    state.scoreRecords.forEach((record) => {
      const key = `${record.studentId}:${record.taskLevel}`;
      const current = latestRecordByStudentTask.get(key);
      if (!current || record.attemptNumber > current.attemptNumber) {
        latestRecordByStudentTask.set(key, record);
      }
    });

    const rows = state.students.flatMap((student) =>
      state.trainingTasks.map((task) => {
        const record = latestRecordByStudentTask.get(`${student.id}:${task.level}`) ?? null;
        const review = record ? reviewedByScoreId.get(record.id) ?? null : null;
        const submission = submissionByStudentTask.get(`${student.id}:${task.level}`) ?? null;
        return {
          student,
          task,
          submission,
          record,
          review,
          status: review
            ? "已复核"
            : record
              ? "已评分"
              : submission
                ? "已提交待评分"
                : "未提交",
        };
      }),
    );
    const scoredRows = rows.filter((row) => row.record);
    const reviewedRows = rows.filter((row) => row.review);
    const dimensionAverages = RUBRIC_DIMENSIONS.map(({ dimension, score }) => {
      const values = scoredRows.flatMap((row) => {
        const reviewDimension = row.review?.dimensions.find(
          (item) => item.dimension === dimension,
        );
        const scoreDimension = row.record?.result.dimensions.find(
          (item) => item.dimension === dimension,
        );
        const source = reviewDimension ?? scoreDimension;
        return source ? [source.score] : [];
      });
      const average =
        values.length > 0
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0;

      return {
        dimension,
        maxScore: score,
        average,
        percent: score > 0 ? Math.round((average / score) * 100) : 0,
      };
    });
    const weakestDimension = [...dimensionAverages].sort(
      (a, b) => a.percent - b.percent,
    )[0];
    const classAverage =
      scoredRows.length > 0
        ? Math.round(
            scoredRows.reduce((sum, row) => {
              const review = row.record ? reviewedByScoreId.get(row.record.id) ?? null : null;
              return sum + (row.record ? getScoreTotal(row.record, review) : 0);
            }, 0) / scoredRows.length,
          )
        : 0;

    return (
      <section className="glass-panel task-panel class-dashboard-panel">
        <div className="section-title">
          <h3>班级能力看板</h3>
          <span>复核优先 · AI 兜底</span>
        </div>

        <div className="dashboard-metrics">
          <div>
            <span>班级平均分</span>
            <strong>{classAverage || "未评分"}</strong>
          </div>
          <div>
            <span>已评分任务</span>
            <strong>
              {scoredRows.length}/{rows.length}
            </strong>
          </div>
          <div>
            <span>已复核任务</span>
            <strong>
              {reviewedRows.length}/{scoredRows.length || 0}
            </strong>
          </div>
        </div>

        <div className="dashboard-grid">
          <article className="score-result-card">
            <div className="section-title compact">
              <h4>五维能力均值</h4>
              <span>{scoredRows.length ? "基于已评分记录" : "等待评分数据"}</span>
            </div>
            <div className="ability-bars">
              {dimensionAverages.map((item) => (
                <div className="ability-row" key={item.dimension}>
                  <div>
                    <strong>{item.dimension}</strong>
                    <span>
                      {item.average.toFixed(1)}/{item.maxScore}
                    </span>
                  </div>
                  <div className="ability-track">
                    <span style={{ width: `${Math.min(100, item.percent)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="score-result-card">
            <div className="section-title compact">
              <h4>薄弱项分析</h4>
              <span>{weakestDimension?.dimension ?? "暂无数据"}</span>
            </div>
            <p className="dashboard-advice">
              {weakestDimension && scoredRows.length
                ? `${weakestDimension.dimension} 当前达成度 ${weakestDimension.percent}%，建议下一轮实训增加示例拆解、同伴互评和教师示范修订。`
                : "班级还没有评分记录，完成学生提交与评分后自动生成薄弱项建议。"}
            </p>
          </article>
        </div>

        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>学生</th>
                <th>任务</th>
                <th>状态</th>
                <th>AI / 示例分</th>
                <th>复核分</th>
                <th>完成情况</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.student.id}-${row.task.level}`}>
                  <td>
                    <strong>{row.student.name}</strong>
                    <span>{row.student.group}</span>
                  </td>
                  <td>
                    <strong>{row.task.level}</strong>
                    <span>{row.task.title}</span>
                  </td>
                  <td>{row.status}</td>
                  <td>{row.record ? `${row.record.result.totalScore} 分` : "-"}</td>
                  <td>{row.review ? `${row.review.totalScore} 分` : "-"}</td>
                  <td>
                    {row.review
                      ? "复核完成"
                      : row.record
                        ? `第 ${row.record.attemptNumber} 次评分`
                        : row.submission
                          ? "待评分"
                          : "待提交"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderPlaceholder() {
    return (
      <section className="glass-panel task-panel placeholder-panel">
        <div className="section-title">
          <h3>{activeContent.title}</h3>
          <span>当前切片未实现</span>
        </div>
        <p>
          当前交付尚未覆盖评分结果和班级看板，不引入额外接口或状态。
        </p>
      </section>
    );
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className="sidebar glass-panel">
        <div className="brand-block">
          <div className="brand-mark">岗</div>
          <div>
            <p className="brand-kicker">职业教育 AI 实训评分平台</p>
            <h1>岗课智评</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="核心模块">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={state.activeNav === item.key ? "nav-item active" : "nav-item"}
              onClick={() => updateState({ activeNav: item.key })}
              type="button"
            >
              <span>{item.label}</span>
              <small>{item.helper}</small>
            </button>
          ))}
        </nav>

        <button className="reset-button" type="button" onClick={resetSampleData}>
          重置本地示例
        </button>
        <button className="reset-button" type="button" onClick={loadFullDemoChain}>
          载入完整演示
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar glass-panel">
          <div>
            <p className="context-label">当前课程</p>
            <h2>{state.courseTitle}</h2>
          </div>

          <div className="switcher" aria-label="视角切换">
            {(["teacher", "student"] as Perspective[]).map((perspective) => (
              <button
                key={perspective}
                className={state.perspective === perspective ? "selected" : ""}
                onClick={() => updateState({ perspective })}
                type="button"
              >
                {perspective === "teacher" ? "教师端" : "学生端"}
              </button>
            ))}
          </div>
        </header>

        <section className="hero glass-panel">
          <div className="hero-copy">
            <p className="context-label">
              {isTeacher ? "教师工作台" : "学生工作台"}
            </p>
            <h2>{activeContent.title}</h2>
            <p>{activeContent.description}</p>
          </div>

          <div className="status-strip">
            <div>
              <strong>
                {state.trainingTasks.length}/{TASK_LEVELS.length}
              </strong>
              <span>已就绪任务数</span>
            </div>
            <div>
              <strong>{state.tasksPublished ? "已发布" : "草稿"}</strong>
              <span>{state.tasksPublished ? publishedText : "等待教师发布"}</span>
            </div>
            <div>
              <strong>localStorage</strong>
              <span>刷新后保留编辑与发布状态</span>
            </div>
          </div>
        </section>

        <section className="content-grid">
          <article className="glass-panel input-panel">
            <div className="section-title">
              <h3>任务来源</h3>
              <span>生成后可切到评分量规页继续编辑</span>
            </div>
            <label>
              课程资料
              <textarea
                value={state.draftInputs.courseMaterial}
                onChange={(event) => updateDraft("courseMaterial", event.target.value)}
              />
            </label>
            <label>
              岗位标准
              <textarea
                value={state.draftInputs.jobStandard}
                onChange={(event) => updateDraft("jobStandard", event.target.value)}
              />
            </label>
            <div className="generation-actions">
              <button
                className="primary-button"
                type="button"
                onClick={generateTrainingTasks}
                disabled={isGenerating}
              >
                {isGenerating ? "生成中..." : "生成分层任务"}
              </button>
              <button className="secondary-button" type="button" onClick={loadSampleTasks}>
                加载示例任务
              </button>
            </div>
          </article>

          <article className="glass-panel preview-panel">
            <div className="section-title">
              <h3>当前状态</h3>
              <span>本地发布，不调用新接口</span>
            </div>

            <select
              value={state.selectedStudentId}
              onChange={(event) => selectStudent(event.target.value)}
            >
              {state.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.group}
                </option>
              ))}
            </select>

            <div className="student-summary">
              <span>当前示例学生</span>
              <strong>{selectedStudent?.name ?? "未选择学生"}</strong>
              <p>
                学生提交会保存到当前浏览器本地状态；AI 评分、教师复核和班级看板将在后续切片接入。
              </p>
            </div>

            <div className="summary-metrics">
              <div>
                <strong>{hasTrainingTasks ? "可编辑" : "未就绪"}</strong>
                <span>评分量规</span>
              </div>
              <div>
                <strong>{state.sampleLoaded ? "示例" : "AI / 草稿"}</strong>
                <span>任务来源</span>
              </div>
              <div>
                <strong>{publishedText}</strong>
                <span>最近发布时间</span>
              </div>
            </div>
          </article>
        </section>

        {state.activeNav === "rubric"
          ? renderRubricEditor()
          : state.activeNav === "ai-workbench"
            ? renderTaskOverview()
            : state.activeNav === "submissions"
              ? renderStudentSubmission()
              : state.activeNav === "results"
                ? renderScoreResultsPage()
                : state.activeNav === "class-dashboard"
                  ? renderClassDashboard()
                  : renderPlaceholder()}
      </section>
    </main>
  );
}
