# Forge AI Agent 助手使用手册

## 目录

1. [系统概述](#1-系统概述)
2. [核心概念：Agent 与 Skill](#2-核心概念agent-与-skill)
3. [群聊模式](#3-群聊模式)
4. [快捷命令](#4-快捷命令)
5. [定时任务](#5-定时任务)
6. [IM 桥接](#6-im-桥接)
7. [API 提供商配置](#7-api-提供商配置)
8. [MCP 服务器](#8-mcp-服务器)
9. [工作区管理](#9-工作区管理)
10. [权限模式](#10-权限模式)
11. [CLI 工具支持说明](#11-cli-工具支持说明)
12. [常见问题](#12-常见问题)

---

## 1. 系统概述

Forge 是一个基于 Electron + Next.js 的本地 AI Agent 助手。它集成了 Anthropic Claude SDK，支持多模型、多 Agent协作、定时任务、IM 桥接等功能。

### 技术架构

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 40.x |
| 前端 | Next.js 15 + React 19 + Tailwind CSS |
| AI SDK | `@anthropic-ai/claude-agent-sdk` |
| 数据库 | SQLite (better-sqlite3) |
| 模型提供商 | Anthropic、MiniMax、GLM、Moonshot、Qwen 等 |

### 核心能力

- **多模型支持**：Anthropic Claude、MiniMax、GLM (Zhipu)、Moonshot (Kimi)、Qwen (通义千问)
- **多 Agent 协作**：主 Agent (秘书) + 多个子 Agent
- **Skill 机制**：可复用的 prompt 模板
- **定时任务**：基于 cron 表达式的自动化任务
- **IM 桥接**：飞书、Telegram、Discord 消息同步
- **MCP 支持**：Model Context Protocol 服务器扩展

---

## 2. 核心概念：Agent 与 Skill

### 2.1 什么是 Agent？

Agent 是 AI 助手的工作实体。每个 Agent 有以下属性：

| 属性 | 说明 |
|------|------|
| `name` | Agent 名称，用于 `@` 调用 |
| `description` | Agent 描述 |
| `model` | 使用的模型（可继承主 Agent 设置） |
| `instructions` | 指令集 |
| `soul` | 人格设定 |
| `identity` | 身份定义 |
| `skillIds` | 绑定的 Skill 列表 |
| `isMain` | 是否为主 Agent |

### 2.2 Agent 的类型

#### 主 Agent (秘书)

主 Agent 是系统的核心协调者。当用户没有明确指定哪个子 Agent 处理事务时，秘书负责：
1. 分析用户需求
2. 判断任务类型
3. 分配给合适的子 Agent
4. 汇总结果并反馈

主 Agent 的 `isMain` 字段为 `true`。

#### 子 Agent

子 Agent 是专门领域的专家。从 `.claude/agents/*.md` 文件加载。每个子 Agent 专注于特定任务：

```
.claude/agents/
├── code-review.md    # 代码审查专家
├── bug-hunt.md       # Bug 追踪专家
├── doc-writer.md     # 文档编写专家
└── ...
```

### 2.3 什么是 Skill？

Skill 是一个可复用的 **prompt 模板**，用于增强 Agent 的特定能力。存储在 `skills` 表中，使用 Markdown + YAML frontmatter 格式。

#### Skill 的结构

```markdown
---
name: skill-name
description: Skill 描述
scope: workspace | global
---

这是 Skill 的 prompt 内容...
```

#### Agent 与 Skill 的关系

```
Agent (agents 表)
    ↕ 多对多 (agent_skills 表)
Skill (skills 表)
```

一个 Agent 可以绑定多个 Skill，一个 Skill 也可以被多个 Agent 使用。

### 2.4 如何使用 Agent

#### 使用 `@` 调用子 Agent

在聊天输入框中输入 `@` 符号，会自动显示可用的子 Agent 列表：

```
@代码审查 /review 这段代码有什么问题
```

#### 使用 `/` 调用 Skill

在聊天输入框中输入 `/` 符号，会显示可用的快捷命令：

```
/skill skill-name 参数
```

---

## 3. 群聊模式

### 3.1 界面布局

群聊模式模仿社交软件的布局：

```
┌─────────────────────────────────────────────────────────┐
│  标题栏                                                   │
├────────────┬──────────────────────────────┬───────────────┤
│            │      消息窗口                  │               │
│  群聊成员    │      (上方)                  │   右侧边栏    │
│  (左侧)     │                              │   (可选)     │
│            ├──────────────────────────────┤               │
│  - 用户     │      输入窗口                  │               │
│  - 秘书     │      (下方)                  │               │
│  - Agent A │                              │               │
│  - Agent B │                              │               │
└────────────┴──────────────────────────────┴───────────────┘
```

### 3.2 群聊成员

左侧面板显示当前群聊的成员：

| 成员 | 说明 |
|------|------|
| **用户** | 当前登录用户 |
| **秘书** | 主 Agent，负责协调和分配任务 |
| **子 Agent** | 可选的专家 Agent，用户可邀请 |

### 3.3 如何邀请子 Agent

1. 点击左侧成员列表的"添加成员"按钮
2. 从可用 Agent 列表中选择
3. 选中的 Agent 将出现在成员列表中

### 3.4 使用 `@` 选择 Agent

在消息输入框中输入 `@` 符号：
1. 会弹出 Agent 选择菜单
2. 选择要处理任务的 Agent
3. 输入具体任务描述
4. 发送消息

**示例**：
```
@代码审查 请检查 src/utils.ts 中的逻辑错误
```

### 3.5 秘书的智能分配

当用户不指定具体 Agent 时，秘书会自动分析并分配：

```
用户：帮我优化一下这个函数的性能
秘书：[分析] 这是一个性能优化任务，分配给 @代码审查
代码审查：[执行任务...]
秘书：[汇总结果] 性能优化已完成，主要改进包括...
```

---

## 4. 快捷命令

### 4.1 内置命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `/clear` | 清除当前会话 | `/clear` |
| `/compact` | 压缩会话历史 | `/compact` |
| `/cost` | 显示 Token 用量 | `/cost` |
| `/diff` | 显示 Git 差异 | `/diff` |
| `/export` | 导出会话为 Markdown | `/export` |
| `/init` | 初始化工作区 | `/init` |
| `/memory` | 打开记忆文件 | `/memory` |
| `/model <id>` | 切换模型 | `/model claude-sonnet-4-6` |
| `/rename <title>` | 重命名会话 | `/rename 新标题` |
| `/stop` | 停止当前响应 | `/stop` |
| `/workspace` | 切换工作区 | `/workspace` |

### 4.2 Skill 命令

使用 `/skill <skill-name>` 调用绑定的 Skill。

### 4.3 Agent 命令

使用 `@<agent-name> <task>` 直接调用子 Agent。

---

## 5. 定时任务

### 5.1 创建定时任务

1. 进入"定时任务"视图
2. 点击"新建任务"
3. 配置任务参数：

| 参数 | 说明 |
|------|------|
| 任务名称 | 任务的标识名称 |
| 执行周期 | Cron 表达式（如 `0 9 * * *` 表示每天 9:00） |
| 执行动作 | `run-agent`、`run-skill` 或 `custom-prompt` |
| 目标 | 指定 Agent 或 Skill |
| 工作区 | 执行任务的工作区 |

### 5.2 Cron 表达式示例

| 表达式 | 说明 |
|--------|------|
| `*/5 * * * *` | 每 5 分钟 |
| `0 9 * * *` | 每天 9:00 |
| `0 9 * * 1-5` | 工作日 9:00 |
| `30 14 28 * *` | 每月 28 日 14:30 |

### 5.3 任务类型

- **run-agent**：运行指定的 Agent
- **run-skill**：执行 Skill prompt
- **custom-prompt**：执行自定义提示词

---

## 6. IM 桥接

### 6.1 支持的平台

- **飞书 (Feishu)**
- **Telegram**
- **Discord**

### 6.2 配置 IM 通道

1. 进入"IM 桥接"视图
2. 选择要配置的平台
3. 填写凭据信息
4. 设置触发模式（`mention` 或 `all`）

### 6.3 消息同步

启用后，IM 平台的消息会同步到 Forge，反之亦然。

---

## 7. API 提供商配置

### 7.1 支持的提供商

| 提供商 | 说明 |
|--------|------|
| Anthropic | Claude 系列模型 |
| MiniMax | MiniMax M2.5 |
| GLM (Zhipu) | 智谱 GLM 系列 |
| Moonshot (Kimi) | 月之暗面 Kimi |
| Qwen (通义千问) | 阿里云千问 |
| Bailian CodingPlan | 阿里百炼编程计划 |
| Custom | 自定义兼容端点 |

### 7.2 认证方式

1. **API Key**：直接输入 API Key
2. **CLI OAuth**：通过 CLI 完成认证流程

### 7.3 配置步骤

1. 进入"设置"视图
2. 选择"API 提供商"
3. 添加或编辑提供商
4. 填写必要信息并测试连接

---

## 8. MCP 服务器

### 8.1 什么是 MCP

MCP (Model Context Protocol) 是一种扩展协议，允许 AI 模型调用外部工具和服务。

### 8.2 配置 MCP 服务器

MCP 服务器配置存储在 `~/.claude.json` 中，Forge 会自动同步。

支持的协议：
- **stdio**：标准输入输出
- **SSE**：Server-Sent Events
- **HTTP**：HTTP 请求

---

## 9. 工作区管理

### 9.1 工作区结构

```
project/
├── .claude/
│   ├── CLAUDE.md       # 项目指令
│   ├── MEMORY.md      # 项目记忆
│   ├── agents/        # 子 Agent 定义
│   ├── skills/        # Skill 定义
│   └── rules/         # 规则文件
└── src/               # 项目源码
```

### 9.2 核心文件

| 文件 | 说明 |
|------|------|
| `CLAUDE.md` | 项目的系统 prompt，影响 AI 行为 |
| `MEMORY.md` | 持久化记忆，跨会话保留 |
| `SOUL.md` | Agent 人格设定 |
| `IDENTITY.md` | Agent 身份定义 |

### 9.3 多工作区

Forge 支持同时管理多个项目工作区，通过左侧边栏切换。

---

## 10. 权限模式

### 10.1 模式类型

| 模式 | 说明 |
|------|------|
| **confirm** | 每次工具使用前询问用户 |
| **full** | 完全信任，允许所有操作 |

### 10.2 切换权限模式

在聊天界面的工具栏中可以随时切换权限模式。

---

## 11. CLI 工具支持说明

### 11.1 当前支持状态

**不支持 Claude Code 以外的 CLI 工具**（如 Open Code、Qwen CLI 等）。

### 11.2 不支持的原因

1. **SDK 紧耦合**：系统使用 `@anthropic-ai/claude-agent-sdk`，专为 Claude Code CLI 设计
2. **专有协议**：SDK 与 CLI 之间的通信使用 Anthropic 专有协议
3. **不同 API**：Open Code 使用 OpenAI API，Qwen CLI 使用阿里巴巴 API，与 Anthropic SDK 不兼容

### 11.3 为什么通过 API 支持更多模型？

Forge **已经支持**多种 AI 模型/提供商通过直接 API 调用：

| 提供商 | 支持方式 | 说明 |
|--------|----------|------|
| Anthropic | API | Claude 系列模型 |
| MiniMax | API | M2.5 模型 |
| GLM (Zhipu) | API | 智谱系列 |
| Moonshot (Kimi) | API | 月之暗面系列 |
| Qwen (通义千问) | API | 阿里云系列 |
| Bailian CodingPlan | API | 阿里百炼 |
| Custom | API | 自定义兼容端点 |

### 11.4 直接 API 的优势

| 方面 | CLI 工具 | 直接 API |
|------|----------|----------|
| 响应速度 | 较慢（CLI 启动开销） | 快 |
| 可靠性 | 依赖进程管理 | 高 |
| 配置 | 需安装 CLI 工具 | 仅需 API Key |
| 通用性 | 单一工具 | 任何提供商 |

### 11.5 结论

Forge 采用直接 API 调用方式支持多种 AI 模型，这是更现代、更灵活的架构。如果需要使用特定提供商的模型，只需配置相应的 API Provider 即可，无需关心底层 CLI 工具。

---

## 12. 常见问题

### Q1: 为什么秘书没有响应？

检查：
1. API Key 是否配置正确
2. 网络连接是否正常
3. 查看控制台错误日志

### Q2: 如何添加新的子 Agent？

在 `.claude/agents/` 目录下创建 `.md` 文件：

```markdown
---
name: my-agent
description: 我的专属 Agent
model: inherit
---

你是一个专业的...
```

### Q3: 如何导出会话？

使用 `/export` 命令可将当前会话导出为 Markdown 文件。

### Q4: 定时任务不执行怎么办？

1. 检查 cron 表达式是否正确
2. 确认任务已启用
3. 检查工作区是否存在

### Q5: 如何理解 Token 用量？

使用 `/cost` 命令查看当前会话的 Token 用量统计。

---

## 附录：文件路径参考

| 文件 | 路径 | 说明 |
|------|------|------|
| 用户数据 | `~/.forge/` | Forge 应用数据 |
| MCP 配置 | `~/.claude.json` | Claude CLI 配置 |
| 工作区 | `项目根目录/.claude/` | 项目级配置 |
