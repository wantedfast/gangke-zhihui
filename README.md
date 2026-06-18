# 岗课智评 MVP

面向 `XA-202603｜科大讯飞｜面向职业教育高水平专业群建设的教学实训与岗位技能智能体开发` 的职业教育 AI 实训评分原型。

当前 MVP 已完成本地闭环：教师生成/加载任务 -> 编辑并发布量规 -> 学生提交文本 + 代码 -> AI/示例评分 -> 学生查看反馈与重提交对比 -> 教师复核 -> 班级能力看板。数据保存于浏览器 `localStorage`，未接入数据库、登录、文件上传或代码执行。

## 已完成范围

- Task 1：工作台骨架、教师/学生视角、五项导航、本地状态保存。
- Task 2：教师输入课程资料和岗位标准，生成三层实训任务；无 DeepSeek Key 时可加载示例任务。
- Task 3：教师编辑三个任务的五维评分量规，并发布到本地状态。
- Task 4：学生身份选择、历史平均分推荐、查看已发布任务、文本 + 代码混合提交、学术诚信提示、本地保存提交。
- Task 5：`/api/score-submission` 服务端评分代理、示例评分兜底、学生端评分反馈、重新提交前后对比。
- Task 6：教师查看提交和 AI/示例评分，修改五维分、扣分原因、改进建议和总评，保存复核结果。
- Task 7：班级看板展示学生任务状态、AI/示例分、复核分、五维能力均值、薄弱项分析和教学建议。
- Task 8：DeepSeek 环境变量示例、统一 API 错误结构、完整示例链路按钮、最终端到端验证。

## 技术栈

- Next.js 16
- React 19
- TypeScript 6
- pnpm

## 本地运行

```bash
pnpm install
pnpm dev
```

打开：

```text
http://localhost:3000
```

构建验证：

```bash
pnpm run build
pnpm run lint
```

注意：当前 `lint` 脚本暂时映射为 `next build`，还没有单独配置 ESLint。

## DeepSeek 配置

复制 `.env.example` 为 `.env.local`，按需填写：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-v4-flash
```

未配置 `DEEPSEEK_API_KEY` 时，AI 生成和 AI 评分 API 会返回结构化错误；页面仍可通过“加载示例任务”“加载示例评分”或“载入完整演示”完成演示。

## 演示路径

最快演示：

1. 打开页面。
2. 点击顶部“载入完整演示”。
3. 查看“班级看板”，确认已有任务、提交、评分、复核和能力分析。

完整手动路径：

1. 教师端进入“AI 生成实训”，生成或加载三道分层任务。
2. 进入“评分量规”，编辑五个固定维度并点击“发布全部任务”。
3. 切换学生端，进入“学生提交”。
4. 选择学生身份，系统按历史平均分推荐任务：`<70` 基础，`70-85` 进阶，`>85` 挑战。
5. 学生勾选学术诚信提示，提交文本 + 代码混合内容。
6. 点击 AI 评分；无 Key 或 API 失败时点击“加载示例评分”。
7. 学生修改后重新提交，查看总分、维度分和反馈文本对比。
8. 切回教师端，在“评分结果”里复核五维分数、扣分原因、改进建议和总评。
9. 进入“班级看板”，查看学生完成状态、复核优先的成绩列表、五维均值、薄弱项和教学建议。

## 项目文档

- PRD：[outputs/gangke-zhihui-prd.md](outputs/gangke-zhihui-prd.md)
- 任务拆解：[outputs/gangke-zhihui-issues.md](outputs/gangke-zhihui-issues.md)
- 交付状态：[outputs/task8-delivery-status.md](outputs/task8-delivery-status.md)

## 验收截图

- Task 1：[outputs/task1-workbench.png](outputs/task1-workbench.png)
- Task 2：[outputs/task2-generated-tasks.png](outputs/task2-generated-tasks.png)
- Task 3：[outputs/task3-rubric-publish.png](outputs/task3-rubric-publish.png)
- Task 4：[outputs/task4-student-submission.png](outputs/task4-student-submission.png)
- Task 5：[outputs/task5-ai-feedback.png](outputs/task5-ai-feedback.png)
- Task 6：[outputs/task6-teacher-review.png](outputs/task6-teacher-review.png)
- Task 7：[outputs/task7-class-dashboard.png](outputs/task7-class-dashboard.png)
- Task 8：[outputs/task8-end-to-end.png](outputs/task8-end-to-end.png)
