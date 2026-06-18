import type {
  RubricDimension,
  RubricItem,
  ScoreRecord,
  ScoreResult,
  Student,
  StudentSubmission,
  TrainingTask,
  WorkbenchState,
} from "@/types/workbench";
import { RUBRIC_DIMENSION_SCORE_MAP } from "@/types/workbench";

function createRubricItem(
  dimension: RubricDimension,
  fields: Omit<RubricItem, "dimension" | "score">,
): RubricItem {
  return {
    dimension,
    score: RUBRIC_DIMENSION_SCORE_MAP[dimension],
    ...fields,
  };
}

export const sampleTrainingTasks: TrainingTask[] = [
  {
    level: "基础",
    title: "校园问答助手需求拆解",
    objective:
      "将课程资料与岗位标准转化为可执行的 AI 应用需求说明，为后续原型设计和实现打底。",
    description:
      "围绕校园问答场景识别用户角色、典型问题、数据边界和基础交互流程，形成一份可以直接交给开发同学继续细化的任务草案。",
    submissionRequirements:
      "提交需求说明文档，包含目标用户、核心问题清单、输入输出示例、至少 3 条验收标准，以及 1 份任务边界说明。",
    evaluationFocus:
      "重点观察学生是否能准确理解业务场景，并把岗位能力要求落到具体功能、输入输出和交付物上。",
    rubric: [
      createRubricItem("岗位需求分析", {
        criteria: "说明目标用户、业务痛点、关键场景和需求边界。",
        excellentStandard:
          "能覆盖主要用户角色、核心流程和异常场景，需求边界与岗位标准对应清楚。",
        passStandard: "能说明基本用户场景和主要功能目标，但边界或流程仍较粗略。",
        deductionPoint: "只罗列功能点，缺少用户场景、业务目标或边界判断。",
      }),
      createRubricItem("AI 应用设计", {
        criteria: "设计问答助手的基础流程、输入输出和人机协同方式。",
        excellentStandard:
          "流程完整，明确提示词、知识来源、输入输出格式和用户反馈闭环。",
        passStandard: "能描述基本问答流程，但缺少反馈机制或异常处理设计。",
        deductionPoint: "方案停留在概念描述，没有形成可执行的应用流程。",
      }),
      createRubricItem("模型接口调用", {
        criteria: "说明哪些环节需要模型能力，以及对应的接口输入输出。",
        excellentStandard:
          "能给出接口参数、调用时机、返回结果处理和失败兜底策略。",
        passStandard: "能指出需要调用模型的环节，但接口约束和返回处理不完整。",
        deductionPoint: "没有把业务需求映射到明确的模型调用环节。",
      }),
      createRubricItem("效果评估与调优", {
        criteria: "设计验证问答质量的测试问题和调优方向。",
        excellentStandard:
          "能覆盖准确性、完整性和稳定性，测试用例与调优动作一一对应。",
        passStandard: "有基础测试问题，但调优策略较模糊或评估维度不完整。",
        deductionPoint: "只有主观判断，没有可复现的测试与调优方案。",
      }),
      createRubricItem("安全合规与文档表达", {
        criteria: "识别隐私、错误回答和文档表达风险，并给出控制方式。",
        excellentStandard:
          "能明确风险类型、处理原则和文档结构，表达清晰、可直接评阅。",
        passStandard: "能识别部分风险并形成基本文档，但条理性一般。",
        deductionPoint: "忽略敏感信息、风险提示或文档结构混乱。",
      }),
    ],
  },
  {
    level: "进阶",
    title: "带知识库检索的智能问答原型",
    objective:
      "基于课程资料设计检索增强问答原型，提升回答的准确性、可追溯性和可维护性。",
    description:
      "构建小型知识库，设计检索、提示词拼装、模型调用、引用展示和异常处理流程，并说明如何根据测试结果迭代方案。",
    submissionRequirements:
      "提交原型说明、核心提示词、接口伪代码或关键代码片段、测试问答样例，以及结果分析与优化建议。",
    evaluationFocus:
      "重点观察学生是否能把模型能力与知识库资料结合，并能基于测试结果推动方案优化。",
    rubric: [
      createRubricItem("岗位需求分析", {
        criteria: "拆解检索增强问答在真实岗位中的业务需求和成功标准。",
        excellentStandard:
          "能明确资料来源、用户问题类型、命中标准和失败场景，分析具有岗位导向。",
        passStandard: "能说明基本业务目标与知识来源，但成功标准或异常场景不完整。",
        deductionPoint: "没有解释为什么需要检索增强，业务目标与方案脱节。",
      }),
      createRubricItem("AI 应用设计", {
        criteria: "设计检索、重排、提示词组装和回答展示流程。",
        excellentStandard:
          "流程清晰，能说明上下文截取策略、引用呈现方式和反馈机制。",
        passStandard: "能描述主要流程，但缺少引用展示或上下文策略设计。",
        deductionPoint: "只描述模型回答，没有形成完整应用链路。",
      }),
      createRubricItem("模型接口调用", {
        criteria: "说明模型调用请求、上下文传参和异常处理逻辑。",
        excellentStandard:
          "能给出接口字段、上下文约束、超时/失败兜底和日志要点。",
        passStandard: "有基本调用说明，但缺少异常处理或上下文限制。",
        deductionPoint: "接口调用与检索流程脱节，无法支持原型落地。",
      }),
      createRubricItem("效果评估与调优", {
        criteria: "建立原型测试问题集并基于结果提出迭代动作。",
        excellentStandard:
          "能按准确性、引用充分性和稳定性组织测试，并提出针对性调优。",
        passStandard: "有测试样例和基础观察，但调优动作不够具体。",
        deductionPoint: "没有基于结果分析原型优缺点和后续优化方向。",
      }),
      createRubricItem("安全合规与文档表达", {
        criteria: "说明知识库数据使用规范、回答风险提示和原型文档结构。",
        excellentStandard:
          "能覆盖数据来源合规、敏感内容过滤和文档复现步骤，表达专业清晰。",
        passStandard: "能说明部分风险和文档内容，但复现说明不完整。",
        deductionPoint: "忽略数据合规或回答风险，文档难以供他人复现。",
      }),
    ],
  },
  {
    level: "挑战",
    title: "岗位标准对齐的 AI 助手迭代方案",
    objective:
      "围绕真实岗位标准形成可评估、可迭代、可合规上线的 AI 助手改进方案。",
    description:
      "在进阶原型基础上加入日志分析、质量评估、提示词迭代、安全审核和人工兜底设计，形成面向教学验收的完整方案。",
    submissionRequirements:
      "提交完整方案文档，包含架构说明、评估指标、迭代记录、安全策略、人工兜底方案和下一轮优化计划。",
    evaluationFocus:
      "重点观察学生是否具备从原型到可交付方案的系统化思考，以及依据数据持续优化的能力。",
    rubric: [
      createRubricItem("岗位需求分析", {
        criteria: "对齐岗位标准，明确功能优先级、交付边界和业务指标。",
        excellentStandard:
          "能把岗位标准拆成阶段目标、关键指标和交付边界，并说明取舍理由。",
        passStandard: "能说明主要目标和交付物，但优先级和指标仍偏粗略。",
        deductionPoint: "没有把岗位标准转成明确的交付目标或评估指标。",
      }),
      createRubricItem("AI 应用设计", {
        criteria: "设计可持续迭代的系统流程、反馈闭环和人工介入点。",
        excellentStandard:
          "能覆盖日志、反馈、人工审核和版本迭代，形成闭环式设计。",
        passStandard: "能描述系统结构，但闭环机制或人工介入点不够明确。",
        deductionPoint: "方案只强调功能堆叠，没有形成可迭代的运行机制。",
      }),
      createRubricItem("模型接口调用", {
        criteria: "说明模型调用在高并发、失败重试、日志留存中的设计。",
        excellentStandard:
          "能兼顾性能、成本、监控和故障恢复，接口设计具有工程可行性。",
        passStandard: "能说明主要调用链路，但缺少监控、成本或重试策略。",
        deductionPoint: "接口设计无法支撑上线场景或缺乏工程约束。",
      }),
      createRubricItem("效果评估与调优", {
        criteria: "建立指标体系并据此制定多轮评估与优化计划。",
        excellentStandard:
          "指标覆盖质量、效率和风险，优化计划与评估结果存在明确因果关系。",
        passStandard: "有指标和优化方向，但层次较浅或缺少优先级安排。",
        deductionPoint: "没有数据化评估框架，优化计划停留在口号层面。",
      }),
      createRubricItem("安全合规与文档表达", {
        criteria: "设计上线前审核、风险分级、人工兜底和方案表达方式。",
        excellentStandard:
          "能说明审核责任、风险等级、人工兜底触发条件和文档结构规范。",
        passStandard: "能识别主要风险并形成基本文档，但审核链路不完整。",
        deductionPoint: "忽略上线风险或文档表达难以支撑教学验收。",
      }),
    ],
  },
];

export function createExampleScoreResult(task: TrainingTask): ScoreResult {
  const dimensionScores = [16, 21, 20, 16, 8];

  const dimensions = task.rubric.map((item, index) => ({
    dimension: item.dimension,
    maxScore: item.score,
    score: Math.min(item.score, dimensionScores[index] ?? Math.round(item.score * 0.8)),
    deductionReason:
      index === 0
        ? "需求边界和验收标准还可以更具体。"
        : index === 1
          ? "应用流程较完整，但异常处理说明略少。"
          : index === 2
            ? "接口输入输出有描述，缺少失败重试和日志细节。"
            : index === 3
              ? "测试样例覆盖基础路径，调优策略还不够量化。"
              : "已识别主要风险，但文档表达还可以更结构化。",
    suggestion:
      index === 0
        ? "补充目标用户、边界条件和可验收指标。"
        : index === 1
          ? "增加反馈闭环、兜底流程和异常输入处理。"
          : index === 2
            ? "写清请求字段、响应解析、超时重试和日志留存。"
            : index === 3
              ? "用多组测试问题记录准确性、完整性和改进动作。"
              : "补充敏感信息处理、人工兜底和文档复现步骤。",
  }));

  return {
    totalScore: dimensions.reduce((sum, item) => sum + item.score, 0),
    dimensions,
    summary:
      "整体方案已经覆盖主要实训要求，能够说明业务场景、AI 应用流程和基本测试思路。下一步应加强接口工程细节、量化评估与安全合规表达。",
  };
}

export function createExampleScoreRecord(
  student: Student,
  task: TrainingTask,
  submission: StudentSubmission,
  attemptNumber: number,
): ScoreRecord {
  const scoredAt = new Date().toISOString();

  return {
    id: `${submission.id}-example-score-${attemptNumber}-${Date.now()}`,
    studentId: student.id,
    taskLevel: task.level,
    submissionId: submission.id,
    submissionContent: submission.content,
    attemptNumber,
    scoredAt,
    source: "example",
    result: createExampleScoreResult(task),
  };
}

export const defaultWorkbenchState: WorkbenchState = {
  perspective: "teacher",
  activeNav: "ai-workbench",
  sampleLoaded: false,
  courseTitle: "大模型应用开发综合实训",
  selectedStudentId: "stu-002",
  selectedSubmissionTaskLevel: null,
  students: [
    { id: "stu-001", name: "林一帆", group: "一组", historicalAverage: 66 },
    { id: "stu-002", name: "陈思琪", group: "一组", historicalAverage: 78 },
    { id: "stu-003", name: "周嘉宁", group: "二组", historicalAverage: 91 },
    { id: "stu-004", name: "赵明远", group: "二组", historicalAverage: 84 },
    { id: "stu-005", name: "许安然", group: "三组", historicalAverage: 69 },
  ],
  trainingTasks: [],
  tasksPublished: false,
  publishedAt: null,
  studentSubmissions: [],
  scoreRecords: [],
  teacherReviews: [],
  selectedScoreRecordId: null,
  draftInputs: {
    courseMaterial:
      "课程围绕大模型应用开发，训练学生完成需求分析、提示词设计、模型接口调用、效果评估与调优，以及安全合规说明。",
    jobStandard:
      "AI 应用开发岗位要求学生能够理解业务场景，设计可落地的智能应用方案，完成模型接口调用，并对输出结果进行评估、调优和风险控制。",
    studentSubmission:
      "我设计了一个校园问答助手，结合知识库检索和大模型回答学生问题，并记录测试样例与改进思路。",
  },
};
