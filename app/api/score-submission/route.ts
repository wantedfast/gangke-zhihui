import { NextResponse } from "next/server";
import type {
  RubricDimension,
  ScoreDimensionResult,
  ScoreResult,
  Student,
  TrainingTask,
} from "@/types/workbench";
import {
  LEGACY_RUBRIC_DIMENSION_MAP,
  RUBRIC_DIMENSIONS,
  RUBRIC_DIMENSION_SCORE_MAP,
} from "@/types/workbench";

const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

type ScoreSubmissionRequest = {
  task?: unknown;
  rubric?: unknown;
  student?: unknown;
  submissionContent?: unknown;
};

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function normalizeDimensionResult(
  value: unknown,
  dimension: RubricDimension,
): ScoreDimensionResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const maxScore = RUBRIC_DIMENSION_SCORE_MAP[dimension];
  const score = Math.max(0, Math.min(maxScore, Math.round(readNumber(value.score))));
  const deductionReason = readString(value.deductionReason);
  const suggestion = readString(value.suggestion);

  if (!deductionReason || !suggestion) {
    return null;
  }

  return {
    dimension,
    maxScore,
    score,
    deductionReason,
    suggestion,
  };
}

function normalizeScore(value: unknown): ScoreResult | null {
  const rawScore = isRecord(value) ? value.score ?? value : value;
  if (!isRecord(rawScore) || !Array.isArray(rawScore.dimensions)) {
    return null;
  }

  const rawDimensions = rawScore.dimensions;
  const dimensions = RUBRIC_DIMENSIONS.map(({ dimension }, index) => {
    const matched = rawDimensions.find(
      (item) =>
        normalizeRubricDimension(
          isRecord(item) ? (item.dimension ?? item.name) : undefined,
        ) === dimension,
    ) ?? rawDimensions[index];
    return normalizeDimensionResult(matched, dimension);
  });

  if (dimensions.some((dimension) => dimension === null)) {
    return null;
  }

  const normalizedDimensions = dimensions as ScoreDimensionResult[];
  const computedTotal = normalizedDimensions.reduce(
    (sum, dimension) => sum + dimension.score,
    0,
  );
  const totalScore = Math.max(
    0,
    Math.min(100, Math.round(readNumber(rawScore.totalScore, computedTotal))),
  );
  const summary = readString(rawScore.summary);

  if (!summary) {
    return null;
  }

  return {
    totalScore,
    dimensions: normalizedDimensions,
    summary,
  };
}

function normalizeTask(value: unknown, fallbackRubric?: unknown): TrainingTask | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = readString(value.title);
  const level = readString(value.level);
  const rubric = Array.isArray(value.rubric)
    ? value.rubric
    : Array.isArray(fallbackRubric)
      ? fallbackRubric
      : null;

  if (!rubric) {
    return null;
  }

  const rubricComplete = RUBRIC_DIMENSIONS.every(({ dimension }) =>
    rubric.some(
      (item) =>
        normalizeRubricDimension(isRecord(item) ? item.dimension : undefined) ===
        dimension,
    ),
  );

  if (!title || !level || !rubricComplete) {
    return null;
  }

  return {
    ...(value as TrainingTask),
    rubric: rubric as TrainingTask["rubric"],
  };
}

function normalizeStudent(value: unknown): Student | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const name = readString(value.name);
  const group = readString(value.group);

  if (!id || !name || !group) {
    return null;
  }

  return {
    id,
    name,
    group,
    historicalAverage: Math.max(
      0,
      Math.min(100, Math.round(readNumber(value.historicalAverage))),
    ),
  };
}

function readAssistantContent(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    return "";
  }

  const firstChoice = value.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return "";
  }

  return readString(firstChoice.message.content);
}

export async function POST(request: Request) {
  let body: ScoreSubmissionRequest;
  try {
    body = (await request.json()) as ScoreSubmissionRequest;
  } catch {
    return apiError("INVALID_JSON", "请求体不是有效 JSON。", 400);
  }

  const task = normalizeTask(body.task, body.rubric);
  const student = normalizeStudent(body.student);
  const submissionContent = readString(body.submissionContent);

  if (!task || !student || !submissionContent) {
    return apiError(
      "MISSING_INPUT",
      "评分需要任务、量规、学生身份和提交内容。",
      400,
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return apiError(
      "MISSING_DEEPSEEK_KEY",
      "服务端未配置 DEEPSEEK_API_KEY，暂时无法进行 AI 评分。",
      503,
    );
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: "system",
            content:
              "你是职业教育实训评分专家。只输出 JSON，不要输出 Markdown。JSON 必须是 {\"score\":{...}}。score 必须包含 totalScore、summary、dimensions。dimensions 必须且只能包含五个维度：岗位需求分析、AI 应用设计、模型接口调用、效果评估与调优、安全合规与文档表达。每个维度必须包含 dimension、score、deductionReason、suggestion。分值上限固定为 20、25、25、20、10，总分 0-100。",
          },
          {
            role: "user",
            content: `学生：${student.name}，${student.group}，历史平均分 ${student.historicalAverage}
任务：${task.level} - ${task.title}
任务目标：${task.objective}
提交要求：${task.submissionRequirements}
评价重点：${task.evaluationFocus}

评分量规：
${task.rubric
  .map(
    (item) =>
      `- ${item.dimension}（${item.score} 分）：${item.criteria}；优秀：${item.excellentStandard}；合格：${item.passStandard}；扣分点：${item.deductionPoint}`,
  )
  .join("\n")}

学生提交：
${submissionContent}

请给出结构化评分。`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2600,
        stream: false,
      }),
    });
  } catch {
    return apiError(
      "UPSTREAM_UNAVAILABLE",
      "AI 评分服务暂时不可用，请稍后重试或加载示例评分。",
      502,
    );
  }

  if (!upstreamResponse.ok) {
    return apiError(
      "UPSTREAM_FAILED",
      `AI 评分服务调用失败（${upstreamResponse.status}）。`,
      502,
    );
  }

  const content = readAssistantContent(await upstreamResponse.json());
  if (!content) {
    return apiError(
      "EMPTY_MODEL_RESPONSE",
      "AI 评分结果为空，请重试或加载示例评分。",
      502,
    );
  }

  try {
    const score = normalizeScore(JSON.parse(content));
    if (!score) {
      return apiError(
        "INVALID_MODEL_JSON",
        "AI 评分结果格式不完整，请重试或加载示例评分。",
        502,
      );
    }

    return NextResponse.json({ result: score });
  } catch {
    return apiError(
      "INVALID_MODEL_JSON",
      "AI 评分结果不是有效 JSON，请重试或加载示例评分。",
      502,
    );
  }
}
