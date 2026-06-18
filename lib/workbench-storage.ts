import { defaultWorkbenchState } from "@/lib/sample-data";
import type {
  RubricDimension,
  RubricItem,
  ScoreDimensionResult,
  ScoreRecord,
  Student,
  StudentSubmission,
  TeacherReview,
  TrainingTask,
  WorkbenchState,
} from "@/types/workbench";
import {
  LEGACY_RUBRIC_DIMENSION_MAP,
  RUBRIC_DIMENSIONS,
  RUBRIC_DIMENSION_SCORE_MAP,
  TASK_LEVELS,
} from "@/types/workbench";

export const WORKBENCH_STORAGE_KEY = "gangke-zhihui.workbench.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readRawString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeRubricDimension(value: unknown): RubricDimension | null {
  const dimension = readString(value);
  if (!dimension) {
    return null;
  }

  if (Object.hasOwn(RUBRIC_DIMENSION_SCORE_MAP, dimension)) {
    return dimension as RubricDimension;
  }

  return LEGACY_RUBRIC_DIMENSION_MAP[dimension] ?? null;
}

function normalizeRubricItem(
  value: unknown,
  dimension: RubricDimension,
): RubricItem | null {
  if (!isRecord(value) || normalizeRubricDimension(value.dimension) !== dimension) {
    return null;
  }

  return {
    dimension,
    score: RUBRIC_DIMENSION_SCORE_MAP[dimension],
    criteria: readString(value.criteria),
    excellentStandard: readString(value.excellentStandard),
    passStandard: readString(value.passStandard),
    deductionPoint: readString(value.deductionPoint),
  };
}

function normalizeRubric(value: unknown): RubricItem[] {
  const rawRubric = Array.isArray(value) ? value : [];

  return RUBRIC_DIMENSIONS.map(({ dimension }) => {
    const matched = rawRubric.find(
      (item) => normalizeRubricDimension(isRecord(item) ? item.dimension : undefined) === dimension,
    );

    return (
      normalizeRubricItem(matched, dimension) ?? {
        dimension,
        score: RUBRIC_DIMENSION_SCORE_MAP[dimension],
        criteria: "",
        excellentStandard: "",
        passStandard: "",
        deductionPoint: "",
      }
    );
  });
}

function normalizeTrainingTask(value: unknown): TrainingTask | null {
  if (!isRecord(value)) {
    return null;
  }

  const level = readString(value.level);
  if (!TASK_LEVELS.includes(level as (typeof TASK_LEVELS)[number])) {
    return null;
  }

  const title = readString(value.title);
  if (!title) {
    return null;
  }

  return {
    level: level as TrainingTask["level"],
    title,
    objective: readString(value.objective),
    description: readString(value.description),
    submissionRequirements: readString(value.submissionRequirements),
    evaluationFocus: readString(value.evaluationFocus),
    rubric: normalizeRubric(value.rubric),
  };
}

function normalizeTrainingTasks(value: unknown): TrainingTask[] {
  if (!Array.isArray(value)) {
    return defaultWorkbenchState.trainingTasks;
  }

  const byLevel = new Map<TrainingTask["level"], TrainingTask>();
  for (const item of value) {
    const normalized = normalizeTrainingTask(item);
    if (normalized && !byLevel.has(normalized.level)) {
      byLevel.set(normalized.level, normalized);
    }
  }

  return TASK_LEVELS.flatMap((level) => {
    const task = byLevel.get(level);
    return task ? [task] : [];
  });
}

function normalizeStudents(value: unknown): Student[] {
  const defaultStudents = defaultWorkbenchState.students;
  if (!Array.isArray(value)) {
    return defaultStudents;
  }

  return defaultStudents.map((defaultStudent) => {
    const saved = value.find(
      (item) => isRecord(item) && readString(item.id) === defaultStudent.id,
    );
    if (!isRecord(saved)) {
      return defaultStudent;
    }

    const historicalAverage =
      typeof saved.historicalAverage === "number" &&
      Number.isFinite(saved.historicalAverage)
        ? Math.max(0, Math.min(100, Math.round(saved.historicalAverage)))
        : defaultStudent.historicalAverage;

    return {
      ...defaultStudent,
      name: readString(saved.name) || defaultStudent.name,
      group: readString(saved.group) || defaultStudent.group,
      historicalAverage,
    };
  });
}

function normalizeStudentSubmissions(value: unknown): StudentSubmission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const studentId = readString(item.studentId);
    const taskLevel = readString(item.taskLevel);
    const content = readRawString(item.content);
    const submittedAt = readString(item.submittedAt);

    if (
      !studentId ||
      !TASK_LEVELS.includes(taskLevel as (typeof TASK_LEVELS)[number]) ||
      !content.trim() ||
      !submittedAt
    ) {
      return [];
    }

    return [
      {
        id: readString(item.id) || `${studentId}-${taskLevel}`,
        studentId,
        taskLevel: taskLevel as TrainingTask["level"],
        content,
        submittedAt,
      },
    ];
  });
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeScoreDimension(
  value: unknown,
  dimension: RubricDimension,
): ScoreDimensionResult {
  const maxScore = RUBRIC_DIMENSION_SCORE_MAP[dimension];
  const record = isRecord(value) ? value : {};
  const rawScore = readNumber(record.score, 0);

  return {
    dimension,
    maxScore,
    score: Math.max(0, Math.min(maxScore, Math.round(rawScore))),
    deductionReason: readString(record.deductionReason),
    suggestion: readString(record.suggestion),
  };
}

function normalizeScoreDimensions(value: unknown): ScoreDimensionResult[] {
  const rawDimensions = Array.isArray(value) ? value : [];

  return RUBRIC_DIMENSIONS.map(({ dimension }) => {
    const matched = rawDimensions.find(
      (item) => normalizeRubricDimension(isRecord(item) ? item.dimension : undefined) === dimension,
    );
    return normalizeScoreDimension(matched, dimension);
  });
}

function normalizeScoreRecords(value: unknown): ScoreRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.result)) {
      return [];
    }

    const studentId = readString(item.studentId);
    const taskLevel = readString(item.taskLevel);
    const submissionContent = readRawString(item.submissionContent);
    const scoredAt = readString(item.scoredAt);

    if (
      !studentId ||
      !TASK_LEVELS.includes(taskLevel as (typeof TASK_LEVELS)[number]) ||
      !submissionContent.trim() ||
      !scoredAt
    ) {
      return [];
    }

    const dimensions = normalizeScoreDimensions(item.result.dimensions);
    const totalScore = Math.max(
      0,
      Math.min(100, Math.round(readNumber(item.result.totalScore, dimensions.reduce((sum, dimension) => sum + dimension.score, 0)))),
    );

    return [
      {
        id: readString(item.id) || `${studentId}-${taskLevel}-${scoredAt}`,
        studentId,
        taskLevel: taskLevel as TrainingTask["level"],
        submissionId: readString(item.submissionId) || `${studentId}-${taskLevel}`,
        submissionContent,
        attemptNumber: Math.max(1, Math.round(readNumber(item.attemptNumber, 1))),
        scoredAt,
        source: item.source === "ai" ? "ai" : "example",
        result: {
          totalScore,
          dimensions,
          summary: readString(item.result.summary),
        },
      },
    ];
  });
}

function normalizeTeacherReviews(value: unknown): TeacherReview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const studentId = readString(item.studentId);
    const taskLevel = readString(item.taskLevel);
    const scoreRecordId = readString(item.scoreRecordId);
    const reviewedAt = readString(item.reviewedAt);

    if (
      !studentId ||
      !scoreRecordId ||
      !reviewedAt ||
      !TASK_LEVELS.includes(taskLevel as (typeof TASK_LEVELS)[number])
    ) {
      return [];
    }

    const dimensions = normalizeScoreDimensions(item.dimensions);
    const totalScore = dimensions.reduce((sum, dimension) => sum + dimension.score, 0);

    return [
      {
        id: readString(item.id) || `${scoreRecordId}-review`,
        scoreRecordId,
        studentId,
        taskLevel: taskLevel as TrainingTask["level"],
        reviewedAt,
        dimensions,
        totalScore,
        summary: readString(item.summary),
      },
    ];
  });
}

function normalizeWorkbenchState(parsed: Partial<WorkbenchState>): WorkbenchState {
  const trainingTasks = normalizeTrainingTasks(parsed.trainingTasks);
  const students = normalizeStudents(parsed.students);
  const tasksPublished =
    parsed.tasksPublished === true && trainingTasks.length === TASK_LEVELS.length;
  const publishedAt = tasksPublished ? readString(parsed.publishedAt) || null : null;
  const selectedSubmissionTaskLevel = TASK_LEVELS.includes(
    readString(parsed.selectedSubmissionTaskLevel) as (typeof TASK_LEVELS)[number],
  )
    ? (readString(parsed.selectedSubmissionTaskLevel) as TrainingTask["level"])
    : null;
  const scoreRecords = normalizeScoreRecords(parsed.scoreRecords);
  const teacherReviews = normalizeTeacherReviews(parsed.teacherReviews);
  const selectedScoreRecordId = scoreRecords.some(
    (record) => record.id === readString(parsed.selectedScoreRecordId),
  )
    ? readString(parsed.selectedScoreRecordId)
    : scoreRecords[scoreRecords.length - 1]?.id ?? null;

  return {
    ...defaultWorkbenchState,
    ...parsed,
    students,
    selectedStudentId:
      readString(parsed.selectedStudentId) || defaultWorkbenchState.selectedStudentId,
    selectedSubmissionTaskLevel,
    trainingTasks,
    tasksPublished,
    publishedAt,
    studentSubmissions: normalizeStudentSubmissions(parsed.studentSubmissions),
    scoreRecords,
    teacherReviews,
    selectedScoreRecordId,
    draftInputs: {
      ...defaultWorkbenchState.draftInputs,
      ...parsed.draftInputs,
      courseMaterial:
        readString(parsed.draftInputs?.courseMaterial) ||
        defaultWorkbenchState.draftInputs.courseMaterial,
      jobStandard:
        readString(parsed.draftInputs?.jobStandard) ||
        defaultWorkbenchState.draftInputs.jobStandard,
      studentSubmission:
        readString(parsed.draftInputs?.studentSubmission) ||
        defaultWorkbenchState.draftInputs.studentSubmission,
    },
  };
}

export function readWorkbenchState(): WorkbenchState {
  if (typeof window === "undefined") {
    return defaultWorkbenchState;
  }

  try {
    const saved = window.localStorage.getItem(WORKBENCH_STORAGE_KEY);
    if (!saved) {
      return defaultWorkbenchState;
    }

    const parsed = JSON.parse(saved) as Partial<WorkbenchState>;
    return normalizeWorkbenchState(parsed);
  } catch {
    return defaultWorkbenchState;
  }
}

export function writeWorkbenchState(state: WorkbenchState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WORKBENCH_STORAGE_KEY, JSON.stringify(state));
}
