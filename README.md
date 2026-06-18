# 岗课智评 MVP

面向 `XA-202603｜科大讯飞｜面向职业教育高水平专业群建设的教学实训与岗位技能智能体开发` 的职业教育 AI 实训评分原型。

当前原型聚焦“老师生成/发布任务，学生查看推荐任务并提交作业”的本地 MVP 闭环。数据暂存于浏览器 `localStorage`，未接入数据库和登录系统。

## 已完成范围

- Task 1：工作台骨架、教师/学生视角、五项导航、本地状态保存。
- Task 2：教师输入课程资料和岗位标准，生成三层实训任务；无 DeepSeek Key 时可加载示例任务。
- Task 3：教师编辑三道任务的五维评分量规，并发布到本地状态。
- Task 4：学生身份选择、历史平均分推荐、查看已发布任务、文本 + 代码混合提交、学术诚信提示、本地保存提交。

## 未完成范围

- Task 5：AI 评分与学生反馈。
- Task 6：老师复核评分。
- Task 7：班级能力看板。
- Task 8：DeepSeek 配置、兜底与最终端到端验证。

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

任务生成 API 会读取服务端环境变量：

```bash
DEEPSEEK_API_KEY=your_key_here
```

未配置时，页面会显示错误提示，并可点击“加载示例任务”继续演示。

## 使用流程

1. 在教师端进入“AI 生成实训”，生成或加载三道分层任务。
2. 进入“评分量规”，编辑五个固定维度并点击“发布全部任务”。
3. 切换到学生端，进入“学生提交”。
4. 选择学生身份，系统根据历史平均分推荐任务等级：
   - `<70`：基础
   - `70-85`：进阶
   - `>85`：挑战
5. 学生查看已发布任务，填写文本 + 代码混合提交内容并保存。

## 项目文档

- PRD：[`outputs/gangke-zhihui-prd.md`](outputs/gangke-zhihui-prd.md)
- 任务拆解：[`outputs/gangke-zhihui-issues.md`](outputs/gangke-zhihui-issues.md)

## 验收截图

- Task 1：[`outputs/task1-workbench.png`](outputs/task1-workbench.png)
- Task 2：[`outputs/task2-generated-tasks.png`](outputs/task2-generated-tasks.png)
- Task 3：[`outputs/task3-rubric-publish.png`](outputs/task3-rubric-publish.png)
- Task 4：[`outputs/task4-student-submission.png`](outputs/task4-student-submission.png)

