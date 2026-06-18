import { NextResponse } from "next/server";
import type {
  RubricDimension,
  RubricItem,
  TrainingTask,
} from "@/types/workbench";
import {
  LEGACY_RUBRIC_DIMENSION_MAP,
  RUBRIC_DIMENSIONS,
  RUBRIC_DIMENSION_SCORE_MAP,
  TASK_LEVELS,
} from "@/types/workbench";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

type GenerateTasksRequest = {
  courseMaterial?: unknown;
  jobStandard?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function normalizeRubric(value: unknown): RubricItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = RUBRIC_DIMENSIONS.map(({ dimension }) => {
    const matched = value.find(
      (item) => normalizeRubricDimension(isRecord(item) ? item.dimension : undefined) === dimension,
    );

    if (!isRecord(matched)) {
      return null;
    }

    const criteria = readString(matched.criteria);
    if (!criteria) {
      return null;
    }

    return {
      dimension,
      score: RUBRIC_DIMENSION_SCORE_MAP[dimension],
      criteria,
      excellentStandard: readString(matched.excellentStandard),
      passStandard: readString(matched.passStandard),
      deductionPoint: readString(matched.deductionPoint),
    };
  });

  if (items.some((item) => item === null)) {
    return null;
  }

  return items as RubricItem[];
}

function normalizeTasks(value: unknown): TrainingTask[] | null {
  const rawTasks = isRecord(value) ? value.tasks : value;
  if (!Array.isArray(rawTasks)) {
    return null;
  }

  const tasks = TASK_LEVELS.map((level) => {
    const rawTask = rawTasks.find((item) => isRecord(item) && item.level === level);
    if (!isRecord(rawTask)) {
      return null;
    }

    const rubric = normalizeRubric(rawTask.rubric);
    const task = {
      level,
      title: readString(rawTask.title),
      objective: readString(rawTask.objective),
      description: readString(rawTask.description),
      submissionRequirements: readString(rawTask.submissionRequirements),
      evaluationFocus: readString(rawTask.evaluationFocus),
      rubric,
    };

    if (
      !task.title ||
      !task.objective ||
      !task.description ||
      !task.submissionRequirements ||
      !task.evaluationFocus ||
      !task.rubric
    ) {
      return null;
    }

    return task as TrainingTask;
  });

  if (tasks.some((task) => task === null)) {
    return null;
  }

  return tasks as TrainingTask[];
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
  let body: GenerateTasksRequest;
  try {
    body = (await request.json()) as GenerateTasksRequest;
  } catch {
    return NextResponse.json({ error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const courseMaterial = readString(body.courseMaterial);
  const jobStandard = readString(body.jobStandard);

  if (!courseMaterial || !jobStandard) {
    return NextResponse.json(
      { error: "请先填写课程资料和岗位标准。" },
      { status: 400 },
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "服务端未配置 DEEPSEEK_API_KEY，暂时无法生成分层任务。" },
      { status: 503 },
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
            content: `你是职业教育实训设计专家。只输出 JSON，不要输出 Markdown。
JSON 必须是 {"tasks":[...]}。
tasks 必须且只能包含三个任务，level 依次为 基础、进阶、挑战。
每个任务必须包含 title、objective、description、submissionRequirements、evaluationFocus、rubric。
rubric 必须且只能包含五个维度，标签固定为：岗位需求分析、AI 应用设计、模型接口调用、效果评估与调优、安全合规与文档表达。
五个维度分值固定为 20、25、25、20、10，但你无需输出可变权重。
每个 rubric item 必须包含 dimension、criteria、excellentStandard、passStandard、deductionPoint。`,
          },
          {
            role: "user",
            content: `课程资料：\n${courseMaterial}\n\n岗位标准：\n${jobStandard}\n\n请生成三层实训任务和可编辑评分量规。`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 3200,
        stream: false,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "AI 生成服务暂时不可用，请稍后重试。" },
      { status: 502 },
    );
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      { error: `AI 生成服务调用失败（${upstreamResponse.status}）。` },
      { status: 502 },
    );
  }

  const content = readAssistantContent(await upstreamResponse.json());
  if (!content) {
    return NextResponse.json(
      { error: "AI 生成结果为空，请稍后重试。" },
      { status: 502 },
    );
  }

  try {
    const tasks = normalizeTasks(JSON.parse(content));
    if (!tasks) {
      return NextResponse.json(
        {
          error:
            "AI 生成结果格式不完整，请重试或先加载示例任务。系统仅接受三道任务和五个固定量规维度。",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json(
      { error: "AI 生成结果不是有效 JSON，请重试或先加载示例任务。" },
      { status: 502 },
    );
  }
}
