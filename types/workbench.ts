export type Perspective = "teacher" | "student";

export type NavKey =
  | "ai-workbench"
  | "rubric"
  | "submissions"
  | "results"
  | "class-dashboard";

export type Student = {
  id: string;
  name: string;
  group: string;
  historicalAverage: number;
};

export const TASK_LEVELS = ["基础", "进阶", "挑战"] as const;

export type TrainingTaskLevel = (typeof TASK_LEVELS)[number];

export const RUBRIC_DIMENSIONS = [
  { dimension: "岗位需求分析", score: 20 },
  { dimension: "AI 应用设计", score: 25 },
  { dimension: "模型接口调用", score: 25 },
  { dimension: "效果评估与调优", score: 20 },
  { dimension: "安全合规与文档表达", score: 10 },
] as const;

export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number]["dimension"];

export type EditableRubricField =
  | "criteria"
  | "excellentStandard"
  | "passStandard"
  | "deductionPoint";

export const LEGACY_RUBRIC_DIMENSION_MAP: Record<string, RubricDimension> = {
  效果评估: "效果评估与调优",
  安全合规: "安全合规与文档表达",
};

export const RUBRIC_DIMENSION_SCORE_MAP: Record<RubricDimension, number> =
  Object.fromEntries(
    RUBRIC_DIMENSIONS.map(({ dimension, score }) => [dimension, score]),
  ) as Record<RubricDimension, number>;

export type RubricItem = {
  dimension: RubricDimension;
  score: number;
  criteria: string;
  excellentStandard: string;
  passStandard: string;
  deductionPoint: string;
};

export type TrainingTask = {
  level: TrainingTaskLevel;
  title: string;
  objective: string;
  description: string;
  submissionRequirements: string;
  evaluationFocus: string;
  rubric: RubricItem[];
};

export type StudentSubmission = {
  id: string;
  studentId: string;
  taskLevel: TrainingTaskLevel;
  content: string;
  submittedAt: string;
};

export type ScoreDimensionResult = {
  dimension: RubricDimension;
  maxScore: number;
  score: number;
  deductionReason: string;
  suggestion: string;
};

export type ScoreResult = {
  totalScore: number;
  dimensions: ScoreDimensionResult[];
  summary: string;
};

export type ScoreRecord = {
  id: string;
  studentId: string;
  taskLevel: TrainingTaskLevel;
  submissionId: string;
  submissionContent: string;
  attemptNumber: number;
  scoredAt: string;
  source: "ai" | "example";
  result: ScoreResult;
};

export type TeacherReview = {
  id: string;
  scoreRecordId: string;
  studentId: string;
  taskLevel: TrainingTaskLevel;
  reviewedAt: string;
  dimensions: ScoreDimensionResult[];
  totalScore: number;
  summary: string;
};

export type WorkbenchState = {
  perspective: Perspective;
  activeNav: NavKey;
  sampleLoaded: boolean;
  courseTitle: string;
  selectedStudentId: string;
  selectedSubmissionTaskLevel: TrainingTaskLevel | null;
  students: Student[];
  trainingTasks: TrainingTask[];
  tasksPublished: boolean;
  publishedAt: string | null;
  studentSubmissions: StudentSubmission[];
  scoreRecords: ScoreRecord[];
  teacherReviews: TeacherReview[];
  selectedScoreRecordId: string | null;
  draftInputs: {
    courseMaterial: string;
    jobStandard: string;
    studentSubmission: string;
  };
};
