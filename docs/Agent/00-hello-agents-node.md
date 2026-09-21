---
title: Hello Agents Node.js 学习项目
description: 面向前端开发者的 Hello-Agents Node.js 学习项目介绍与任务进度
category: Agent
tag:
  - Agent
---

# Hello Agents Node.js 学习项目

## 项目介绍

[hello-agents](https://github.com/yinian77/hello-agents) 是我在学习 Agent 过程中维护的 Node.js 实践项目。项目参考了 Datawhale 的 Python 项目 
[Hello-Agents](https://github.com/datawhalechina/Hello-Agents)，并将相关教程与示例改写为基于 Node.js 20+ 和 ESM 的 JavaScript 版本。

这个项目并非原项目的官方移植版本，主要目的是使用前端开发者熟悉的 JavaScript 技术栈理解 Agent 的核心概念，降低从前端开发进入 AI Agent 领域的学习门槛。

## 学习目标

- 理解大语言模型与 Agent 的基础概念。
- 掌握模型调用、Function Calling 和工具使用。
- 学习常见的 Agent 设计模式及框架原理。
- 实践记忆系统、RAG 与知识库检索。
- 了解上下文工程、MCP 和 A2A 等协议。
- 掌握 Agent 测试、效果评估与综合项目开发。

## 项目结构

```text
hello-agents/
├── doc/          按章节整理的学习文档
├── src/          各章节对应的 Node.js 示例
├── tests/        单元测试与评测任务
└── data/         本地演示数据
```

示例代码按照学习阶段划分：

1. `01-foundations`：模型调用与语言模型基础。
2. `02-tools-and-patterns`：工具、Agent 范式与框架。
3. `03-memory-and-rag`：记忆、检索与知识库。
4. `04-context-and-protocols`：上下文工程、MCP 与 A2A。
5. `05-evaluation-and-projects`：Agent 评测与综合项目。

## 任务进度

> 最近更新：2026-07-21

### 已完成

- [x] 初始化 Node.js 20+、ESM 和 pnpm 项目结构。
- [x] 整理 16 个章节的学习文档。
- [x] 完成第一章智能体基础内容。
- [x] 完成基于 Function Calling 的旅行助手示例。
- [x] 支持通过 `.env` 配置模型地址、模型名称和 API Key。

### 进行中

- [ ] 完善语言模型基础相关示例。
- [ ] 实现工具调用与常见 Agent 设计模式。
- [ ] 补充各章节的单元测试。

### 后续计划

- [ ] 实现记忆系统、RAG 与本地知识库。
- [ ] 实践上下文工程、MCP 和 A2A 协议。
- [ ] 增加 Agent 效果评估示例。
- [ ] 完成旅行助手、Deep Research Agent 等综合项目。
- [ ] 持续校对文档并优化前端开发者的阅读体验。

## 运行项目

```bash
git clone https://github.com/yinian77/hello-agents.git
cd hello-agents
pnpm install
pnpm run dev
```

在项目根目录创建 `.env`，填写所使用的模型服务：

```dotenv
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=your-model
```

然后运行第一个 Agent 示例：

```bash
pnpm start
```

项目会随着学习进度持续补充代码、测试与实践记录。
