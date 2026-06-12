# Respond

Zalo OA ↔ Respond.io Custom Channel 双向通信项目，后续支持 AI Agent。

## 技术栈

- Node.js 20
- Express
- Netlify Functions
- axios
- dotenv

## 项目结构

```
respond/
├── netlify/
│   └── functions/
│       ├── oauth-callback.js    # OAuth回调处理
│       ├── zalo-webhook.js     # Zalo Webhook处理
│       ├── message.js          # 消息处理
│       ├── refresh-token.js    # Token刷新
│       └── health.js           # 健康检查
├── utils/
│   ├── zalo.js                 # Zalo API工具
│   ├── respondio.js            # Respond.io API工具
│   └── logger.js               # 日志工具
├── package.json
├── netlify.toml
├── .env.example
├── README.md
└── .gitignore
```

## 环境配置

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

## 开发

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建
npm run build

# 部署
npm run deploy
```

## API端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/.netlify/functions/health` | GET | 健康检查 |
| `/.netlify/functions/zalo-webhook` | POST | Zalo Webhook |
| `/.netlify/functions/oauth-callback` | GET | OAuth回调 |
| `/.netlify/functions/message` | POST | 消息处理 |
| `/.netlify/functions/refresh-token` | POST | Token刷新 |

## License

ISC