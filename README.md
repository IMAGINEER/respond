# Respond - Zalo OA ↔ Respond.io Bridge

双向通信桥接器，连接 Zalo OA 与 Respond.io Custom Channel，支持文字消息双向通信。

## 技术栈

- Node.js 20
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
│       ├── message.js          # Respond.io 出站消息
│       ├── oauth-callback.js   # (预留)
│       ├── refresh-token.js    # (预留)
│       └── utils/
│           ├── logger.js       # 结构化 JSON 日志
│           ├── respondio.js    # Respond.io API 客户端
│           └── zalo.js        # Zalo API 客户端
├── package.json
├── netlify.toml
├── .env.example
└── README.md
```

---

## 部署流程

### 1. 部署到 Netlify

**方式 A: GitHub 集成（推荐）**

1. 登录 [Netlify](https://app.netlify.com)
2. 点击 "Add new site" → "Import an existing project"
3. 选择 GitHub 仓库 `IMAGINEER/respond`
4. 构建设置：
   - Build command: （留空）
   - Publish directory: （留空）
   - Functions directory: `netlify/functions`
5. 点击 "Deploy site"

**方式 B: Netlify CLI**

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### 2. 配置环境变量

在 Netlify Dashboard → Site Settings → Environment Variables:

| 变量 | 描述 | 示例 |
|------|------|------|
| `ZALO_ACCESS_TOKEN` | Zalo API 访问令牌 | `xxx` |
| `ZALO_APP_ID` | Zalo 应用 ID | `123456789` |
| `ZALO_APP_SECRET` | Zalo 应用密钥 | `xxx` |
| `ZALO_OA_ID` | Zalo 官方账号 ID | `123456789` |
| `RESPONDIO_INCOMING_WEBHOOK` | Respond.io 入站 Webhook URL | `https://app.respond.io/custom/webhook` |
| `RESPONDIO_API_TOKEN` | Respond.io API 令牌 | `xxx` |
| `RESPONDIO_CHANNEL_ID` | Respond.io Channel ID | `xxx` |
| `LOG_LEVEL` | 日志级别 | `INFO` |

### 3. 获取 Functions URL

部署完成后，Netlify 会分配一个 URL：

```
https://[site-name].netlify.app/.netlify/functions/health
```

记录以下端点：
- Health: `https://[site].netlify.app/.netlify/functions/health`
- Zalo Webhook: `https://[site].netlify.app/.netlify/functions/zalo-webhook`
- Message: `https://[site].netlify.app/.netlify/functions/message`

---

## Zalo OA 配置

### 1. 获取 Zalo API 凭证

1. 登录 [Zalo OA Platform](https://developers.zalo.me/)
2. 创建应用或选择现有应用
3. 获取以下信息：
   - App ID
   - App Secret
4. 使用 OAuth 获取 Access Token（需要手动刷新）

### 2. 配置 Webhook

1. 在 Zalo OA 后台 → 设置 → Webhook
2. 设置 URL: `https://[site].netlify.app/.netlify/functions/zalo-webhook`
3. 验证 token 可留空（此实现不验证签名）
4. 订阅事件：
   - `user_send_text` ✅
   - 其他事件（会自动忽略）

### 3. Zalo API 端点

- 发送消息: `POST https://openapi.zalo.me/v3.0/oa/message/cs`
- Header: `access_token: YOUR_ZALO_ACCESS_TOKEN`

---

## Respond.io 配置

### 1. 创建 Custom Channel

1. 登录 Respond.io
2. 进入 Settings → Channels → Add Channel
3. 选择 "Custom Channel"
4. 配置：
   - Channel Name: `Zalo`
   - Channel ID: 保存到 `RESPONDIO_CHANNEL_ID`

### 2. 配置 Webhook（出站）

在 Custom Channel 设置中：

1. Webhook URL: `https://[site].netlify.app/.netlify/functions/message`
2. Authentication: 使用 `RESPONDIO_API_TOKEN`
3. 保存

### 3. 配置 Inbound Webhook URL

在 Respond.io 设置中：

1. 进入 Settings → Webhooks → Add Webhook
2. URL: `https://[site].netlify.app/.netlify/functions/zalo-webhook`（用于测试）
3. 注意：实际入站由 Zalo 调用此 URL

### 4. 获取 API Token

1. 在 Respond.io → Settings → API Keys
2. 创建新 API Key
3. 保存到 `RESPONDIO_API_TOKEN`

---

## 测试流程

### 1. 健康检查

```bash
curl https://[site].netlify.app/.netlify/functions/health
```

**预期响应:**
```json
{"status":"ok"}
```

### 2. 测试 Zalo Webhook（模拟 Zalo 入站）

```bash
curl -X POST https://[site].netlify.app/.netlify/functions/zalo-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": { "id": "246845883529197922" },
    "event_name": "user_send_text",
    "message": { "text": "Hello from Zalo" }
  }'
```

**预期响应:**
```json
{"status":"ok"}
```

### 3. 测试 Respond.io 出站（模拟 Respond.io 发送）

```bash
curl -X POST https://[site].netlify.app/.netlify/functions/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_RESPONDIO_API_TOKEN" \
  -d '{
    "contactId": "246845883529197922",
    "message": { "text": "Hello from Respond.io" }
  }'
```

**成功响应:**
```json
{"mId":"123456789"}
```

**失败响应 (401):**
```json
{"error":"Unauthorized"}
```

### 4. 测试忽略事件（image 类型）

```bash
curl -X POST https://[site].netlify.app/.netlify/functions/zalo-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": { "id": "246845883529197922" },
    "event_name": "user_send_image",
    "message": {}
  }'
```

**预期响应:**
```json
{"status":"ok"}
```

---

## 调试方法

### 1. 查看 Netlify Functions 日志

在 Netlify Dashboard → Functions → 选择 function → 查看实时日志

### 2. 设置 LOG_LEVEL=DEBUG

在环境变量中设置 `LOG_LEVEL=DEBUG` 可获取详细日志

### 3. 日志格式

所有日志输出为 JSON：

```json
{
  "timestamp": "2026-06-12T10:00:00.000Z",
  "level": "INFO",
  "message": "Processing text message",
  "type": "zalo_inbound",
  "action": "process",
  "requestId": "req_xxx",
  "senderId": "246845883529197922",
  "messageId": "zalo_xxx"
}
```

### 4. 常见日志类型

| type | action | 描述 |
|------|--------|------|
| `zalo_inbound` | `received` | 收到 Zalo 请求 |
| `zalo_inbound` | `ignored` | 忽略不支持的事件 |
| `zalo_inbound` | `process` | 处理文本消息 |
| `zalo_inbound` | `forward_failed` | 转发到 Respond.io 失败 |
| `zalo_inbound` | `success` | 入站处理成功 |
| `message_outbound` | `received` | 收到 Respond.io 请求 |
| `message_outbound` | `reject` | 请求被拒绝（认证失败等） |
| `message_outbound` | `zalo_failed` | Zalo API 调用失败 |
| `message_outbound` | `success` | 出站处理成功 |

---

## 异常处理

### 空消息

- 空 `message.text` → 返回 200，日志 `reject`

### 非法请求

- 缺少 `contactId` → 400
- 缺少 `Authorization` → 401
- 无效 JSON → 400

### 网络超时

- Zalo API 超时（10s）→ 重试由调用方处理
- Respond.io 超时 → 返回 200，防止 Zalo 重试

### 错误响应

| 场景 | HTTP 状态码 | 响应 |
|------|-------------|------|
| 成功 | 200 | `{"status":"ok"}` 或 `{"mId":"..."}` |
| 方法不允许 | 405 | `{"error":"Method Not Allowed"}` |
| 认证失败 | 401 | `{"error":"Unauthorized"}` |
| 请求格式错误 | 400 | `{"error":"..."}` |
| Zalo API 错误 | 500 | `{"error":"Failed to send message"}` |

---

## 环境变量说明

| 变量 | 必填 | 描述 |
|------|------|------|
| `ZALO_ACCESS_TOKEN` | ✅ | Zalo API 访问令牌（需手动刷新） |
| `ZALO_APP_ID` | ✅ | Zalo 应用 ID |
| `ZALO_APP_SECRET` | ✅ | Zalo 应用密钥 |
| `ZALO_OA_ID` | ❌ | Zalo 官方账号 ID（用于某些 API） |
| `RESPONDIO_INCOMING_WEBHOOK` | ✅ | Respond.io 入站 Webhook URL |
| `RESPONDIO_API_TOKEN` | ✅ | Respond.io API 令牌 |
| `RESPONDIO_CHANNEL_ID` | ✅ | Respond.io Channel ID |
| `LOG_LEVEL` | ❌ | 日志级别 (INFO/DEBUG)，默认 INFO |

---

## 已完成功能

- ✅ `health.js` - GET 健康检查
- ✅ `zalo-webhook.js` - 入站文字消息处理
- ✅ `message.js` - 出站文字消息处理
- ✅ Bearer token 认证
- ✅ 结构化 JSON 日志
- ✅ CORS 支持
- ✅ 异常场景处理（空消息、非法请求、网络超时）
- ✅ 忽略不支持的事件类型（image, video, audio 等）

## 未完成功能

- ❌ OAuth 自动刷新（需要手动刷新 Zalo token）
- ❌ 媒体消息（image, video, audio）
- ❌ 模板消息
- ❌ 快速回复
- ❌ 已读回执
- ❌ 输入状态指示

---

## 本地开发

```bash
# 安装依赖
npm install

# 安装 Netlify CLI
npm install -g netlify-cli

# 本地开发
netlify dev

# 测试 health 端点
curl http://localhost:8888/.netlify/functions/health

# 测试 webhook（需要修改 .env）
curl -X POST http://localhost:8888/.netlify/functions/zalo-webhook \
  -H "Content-Type: application/json" \
  -d '{"sender":{"id":"123"},"event_name":"user_send_text","message":{"text":"test"}}'
```

## License

ISC