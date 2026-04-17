# Requirements App - AI 驱动的智能需求管理平台

一款面向产品经理团队的智能需求管理工具，集成 AI 辅助评审、功能拆解和接口提取能力。支持独立部署，也可作为微前端子应用通过 iframe 嵌入到主平台中使用。

## 功能特性

### 需求管理
- 看板视图（拖拽排序）、列表视图、统计报表
- 需求 CRUD、批量操作（状态/优先级/指派人/删除）
- 富文本编辑、评论、附件上传、验收标准、依赖关系
- 按项目/状态/优先级/指派人筛选和搜索

### AI 智能分析（集成智谱 AI）
- **需求评审** — 上传文档或选择已有需求，AI 自动从完整性、一致性、清晰性、可测试性、安全性、性能 6 大维度生成评审问题
- **PRD 功能拆解** — AI 分析文档提取功能点，支持 Kano 模型分类和优先级排序
- **接口提取** — AI 从文档中自动识别和提取 API 接口信息
- 评审/拆解/接口记录支持归档和历史查看

### 文档处理
- 导入：支持 Word（.docx）、PDF、TXT 文档解析
- 导出：支持 Excel、Word、PDF 报告生成

## 技术栈

**前端** — React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Radix UI + Tiptap + Recharts + @dnd-kit

**后端** — Express + MongoDB (Mongoose) + JWT + 智谱 AI (GLM-4-Flash) + Winston + Multer

## 快速开始

### 环境要求

- Node.js >= 18
- MongoDB（可选，支持 Mock 模式）

### 安装

```bash
# 克隆项目
git clone https://github.com/wy572039475/requirements-app.git
cd requirements-app

# 安装前端依赖
npm install

# 安装后端依赖
cd backend && npm install && cd ..
```

### 配置环境变量

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，主要配置项：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端端口 | 3003 |
| `MONGODB_URI` | MongoDB 连接地址 | `mongodb://localhost:27017/requirements-app` |
| `USE_MOCK_DB` | 使用 Mock 数据库（无需 MongoDB） | false |
| `JWT_SECRET` | JWT 密钥（生产环境必须修改） | - |
| `ZHIPUAI_API_KEY` | 智谱 AI API Key | - |

### 启动

```bash
# 同时启动前后端
npm run dev:full

# 或分别启动
npm run dev          # 前端 (http://localhost:5177)
cd backend && npm run dev  # 后端 (http://localhost:3003)
```

启动后访问 http://localhost:5177 即可使用。

## Mock 模式

如果没有 MongoDB 或智谱 AI API Key，可以启用 Mock 模式运行：

```env
USE_MOCK_DB=true
```

Mock 模式下：
- 使用内存数据替代 MongoDB，无需数据库连接
- 首次启动会自动创建默认用户（admin/pm/developer/designer，密码均为 `123456`）
- AI 功能使用模拟数据

## 微前端嵌入

本项目支持作为子应用被 iframe 嵌入：

- 父应用通过 `postMessage` 发送 `{ type: 'SET_PROJECT', data: { projectId } }` 注入项目上下文
- 子应用初始化完成后发送 `{ type: 'REQUIREMENTS_READY' }` 通知父应用
- 也可通过 URL 参数传递项目 ID：`/requirements?projectId=xxx`

## 项目结构

```
requirements-app/
├── src/                          # 前端源码
│   ├── main.tsx                  # 入口（含 iframe 通信监听）
│   ├── App.tsx                   # 路由配置
│   ├── pages/                    # 页面
│   │   ├── Login.tsx             # 登录/注册
│   │   └── Requirements.tsx      # 需求管理主页面（4 个 tab）
│   ├── components/               # 组件
│   │   ├── RequirementsBoard.tsx # 需求看板
│   │   ├── AIRequirementsEngine.tsx  # AI 需求评审
│   │   ├── PRDFeatureBreakdown.tsx   # 功能拆解
│   │   ├── InterfaceList.tsx     # 接口提取
│   │   └── ui/                   # 基础 UI 组件
│   ├── store/                    # Zustand 状态管理
│   ├── services/                 # API 服务层
│   ├── hooks/                    # 自定义 Hooks
│   ├── types/                    # TypeScript 类型
│   └── utils/                    # 工具函数
├── backend/                      # 后端源码
│   ├── server.js                 # Express 入口（端口 3003）
│   ├── config/                   # 配置（数据库、AI、初始化）
│   ├── middleware/               # JWT 认证中间件
│   ├── models/                   # Mongoose 数据模型
│   └── routes/                   # API 路由
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## License

MIT
