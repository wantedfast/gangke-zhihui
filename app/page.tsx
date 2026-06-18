"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultWorkbenchState, sampleTrainingTasks } from "@/lib/sample-data";
import { readWorkbenchState, writeWorkbenchState } from "@/lib/workbench-storage";
import type {
  EditableRubricField,
  NavKey,
  Perspective,
  RubricDimension,
  Student,
  TrainingTask,
  WorkbenchState,
} from "@/types/workbench";
import { RUBRIC_DIMENSIONS, TASK_LEVELS } from "@/types/workbench";

const navItems: Array<{ key: NavKey; label: string; helper: string }> = [
  { key: "ai-workbench", label: "AI 生成实训", helper: "课程资料与岗位标准" },
  { key: "rubric", label: "评分量规", helper: "教师编辑与本地发布" },
  { key: "submissions", label: "学生提交", helper: "后续切片接入" },
  { key: "results", label: "评分结果", helper: "后续切片接入" },
  { key: "class-dashboard", label: "班级看板", helper: "后续切片接入" },
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
    description: "当前任务只实现教师量规编辑与发布，这里保留后续接入口。",
  },
  "class-dashboard": {
    title: "班级能力看板",
    description: "当前任务只实现教师量规编辑与发布，这里保留后续接入口。",
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

export default function Home() {
  const [state, setState] = useState<WorkbenchState>(defaultWorkbenchState);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");

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
        error?: string;
      };
      const tasks = payload.tasks;

      if (!response.ok || !tasks) {
        throw new Error(payload.error || "生成分层任务失败，请稍后重试。");
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
          </>
        )}
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
            : renderPlaceholder()}
      </section>
    </main>
  );
}
