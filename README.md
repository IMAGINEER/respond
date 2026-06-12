# Respond - Zalo OA ↔ Respond.io Bridge

双向通信桥接器，连接 Zalo OA 与 Respond.io Custom Channel。

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
│       ├── health.js           # 健康检查
│       ├── zalo-webhook.js     # Zalo 入站 webhook
│       └── message.js          # Respond.io 出站消息
├── utils/
│   ├── logger.js               # 结构化日志
│   ├── respondio.js            # Respond.io API 客户端
│   └── zalo.js                # Zalo API 客户端
├── package.json
├── netlify.toml
├── .env.example
├── README.md
└── .gitignore
```

## 环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

| 变量 | 描述 |
|------|------|
| `ZALO_APP_ID` | Zalo 应用 ID |
| `ZALO_APP_SECRET` | Zalo 应用密钥 |
| `ZALO_ACCESS_TOKEN` | Zalo API 访问令牌 |
| `ZALO_REFRESH_TOKEN` | Zalo API 刷新令牌 |
| `ZALO_OA_ID` | Zalo 官方账号 ID |
| `RESPONDIO_INCOMING_WEBHOOK` | Respond.io 入站 Webhook URL |
| `RESPONDIO_API_TOKEN` | Respond.io API 令牌 |
| `RESPONDIO_CHANNEL_ID` | Respond.io Channel ID |
| `LOG_LEVEL` | 日志级别 (INFO/DEBUG) |

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

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/.netlify/functions/health` | GET | 健康检查 |
| `/.netlify/functions/zalo-webhook` | POST | Zalo 入站 Webhook |
| `/.netlify/functions/message` | POST | Respond.io 出站消息 |

## 数据流

### 入站 (Zalo → Respond.io)

```
用户 → Zalo OA → Webhook → zalo-webhook.js → Respond.io
```

**Zalo Webhook Payload:**
```json
{
  "sender": { "id": "246845883529197922" },
  "event_name": "user_send_text",
  "message": { "text": "hello" }
}
```

**Respond.io Inbound Payload:**
```json
{
  "channelId": "your_channel_id",
  "contactId": "246845883529197922",
  "events": [{
    "type": "message",
    "mId": "zalo_1234567890_abc123",
    "timestamp": 1234567890000,
    "message": { "type": "text", "text": "hello" }
  }]
}
```

### 出站 (Respond.io → Zalo)

```
Respond.io → message.js → Zalo API → 用户
```

**Respond.io Outbound Payload:**
```json
{
  "contactId": "246845883529197922",
  "message": { "text": "Hello from Respond.io" }
}
```

**Zalo API Request:**
```
POST https://openapi.zalo.me/v3.0/oa/message/cs
Header: access_token: YOUR_ZALO_ACCESS_TOKEN
Body: {
  "recipient": { "user_id": "246845883529197922" },
  "message": { "text": "Hello from Respond.io" }
}
```

## 测试

### 健康检查

```bash
curl https://your-site.netlify.app/.netlify/functions/health
```

响应：
```json
{"status": "ok"}
```

### 测试 Zalo Webhook (入站)

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/zalo-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": { "id": "246845883529197922" },
    "event_name": "user_send_text",
    "message": { "text": "Hello" }
  }'
```

### 测试 Respond.io 出站消息

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_RESPONDIO_API_TOKEN" \
  -d '{
    "contactId": "246845883529197922",
    "message": { "text": "Hello from Respond.io" }
  }'
```

### 本地测试

使用 [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install -g netlify-cli
netlify dev
```

然后访问 `http://localhost:8888/.netlify/functions/health`

## 部署

### Netlify

1. 连接 GitHub 仓库到 Netlify
2. 设置环境变量（在 Netlify Dashboard → Site Settings → Environment Variables）
3. 部署

### Zalo Webhook 配置

1. 在 Zalo OA 后台配置 Webhook URL
2. URL: `https://your-site.netlify.app/.netlify/functions/zalo-webhook`
3. 验证 token 可留空（此实现不验证签名）

### Respond.io 配置

1. 在 Respond.io 创建 Custom Channel
2. 设置 Webhook URL: `https://your-site.netlify.app/.netlify/functions/message`
3. 使用 `RESPONDIO_API_TOKEN` 作为 Channel API Token

## 支持的事件类型

### 入站 (Zalo → Respond.io)

- ✅ `user_send_text` - 文本消息

### 忽略的事件类型（仅记录日志）

- `user_send_image` - 图片
- `user_send_video` - 视频
- `user_send_audio` - 音频
- `user_send_link` - 链接
- `user_send_sticker` - 表情
- `user_send_location` - 位置
- `user_send_file` - 文件

## 日志格式

所有日志输出为 JSON 格式：

```json
{
  "timestamp": "2026-06-12T10:00:00.000Z",
  "level": "INFO",
  "message": "Processing Zalo inbound message",
  "type": "zalo_inbound",
  "senderId": "246845883529197922",
  "messageId": "zalo_1234567890_abc123"
}
```

## License

ISC