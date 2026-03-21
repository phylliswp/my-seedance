# Seedance Studio

个人 AI 视频生成工作台，基于字节跳动 [Seedance](https://www.volcengine.com/docs/82379) 大模型。

## 功能

- **文字生成视频** — 输入 prompt 直接生成
- **图片生成视频** — 上传首帧图片 + prompt 控制
- **多模型切换** — Seedance 2.0 / 1.5 Pro / 1.0 系列
- **参数调节** — 比例、时长、分辨率、种子、锁定镜头等
- **任务管理** — 自动轮询进度，在线预览和下载

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + TypeScript + Vite |
| 后端 | Node.js + Express |
| API | 火山引擎 Ark API (Seedance) |

## 前置条件

1. **Node.js ≥ 18**（推荐用 [fnm](https://github.com/Schniz/fnm) 安装）
   ```bash
   # macOS
   brew install fnm
   fnm install 22
   fnm use 22
   ```

   若你用的是 nvm，本项目根目录已提供 `.nvmrc`，可执行：
   ```bash
   nvm use
   ```

2. **火山引擎 API Key** — 在 [控制台](https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey) 创建

## 快速开始

```bash
# 1. 安装依赖
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env 填入你的 ARK_API_KEY

# 3. 启动开发环境（前后端同时启动）
npm run dev
```

说明：`npm run dev` 会自动尝试加载 nvm（如果本机已安装），减少环境不一致导致的启动失败。

前端：http://localhost:5173  
后端：http://localhost:3001

## 项目结构

```
seedance/
├── server/                  # 后端 API 代理
│   └── src/
│       ├── index.js         # Express 入口
│       ├── routes/tasks.js  # 任务路由
│       └── services/ark.js  # 火山引擎 API 封装
├── client/                  # 前端 React 应用
│   └── src/
│       ├── App.tsx          # 主页面
│       ├── api.ts           # API 调用
│       ├── types.ts         # 类型定义
│       └── components/
│           ├── CreatePanel.tsx  # 创建任务面板
│           └── TaskList.tsx     # 任务列表
├── .env.example             # 环境变量模板
└── package.json             # 根项目配置
```

## API Key 安全

API Key 仅存在后端 `.env` 中，前端通过后端代理调用，不会暴露密钥。

## 支持的模型

| 模型 | 特点 |
|---|---|
| Seedance 2.0 | 旗舰，2K 60FPS，多模态输入 |
| Seedance 1.5 Pro | 均衡，支持草稿模式 |
| Seedance 1.0 Pro | 稳定，首尾帧精确控制 |
| Seedance 1.0 Pro Fast | 速度优先 |
| Seedance 1.0 Lite I2V | 轻量图生视频 |

## 生成参数说明

| 参数 | 选项 | 说明 |
|---|---|---|
| 画面比例 | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 输出视频的画面比例 |
| 时长 | 4-15 秒, 自动 | 视频长度 |
| 分辨率 | 480p, 720p, 1080p | 输出分辨率 |
| 随机种子 | -1 (随机) 或指定值 | 复现相同结果 |
| 锁定镜头 | 开/关 | 固定摄像机位置 |
| 返回末帧 | 开/关 | 获取视频最后一帧（用于衔接续拍） |

## License

MIT
