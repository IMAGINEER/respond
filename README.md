# Respond - Zalo ↔ Respond.io Bridge

文字消息双向通信桥接器。

## 部署

1. 连接 GitHub 仓库到 Netlify
2. 配置环境变量（见下方）
3. 部署

## 环境变量

| 变量 | 必填 | 描述 |
|------|------|------|
| `ZALO_ACCESS_TOKEN` | ✅ | Zalo API 访问令牌 |
| `RESPONDIO_INCOMING_WEBHOOK` | ✅ | Respond.io 入站 Webhook URL |
| `RESPONDIO_API_TOKEN` | ✅ | Respond.io API 令牌 |
| `RESPONDIO_CHANNEL_ID` | ✅ | Respond.io Channel ID |
| `ZALO_APP_ID` | ❌ | Zalo App ID |
| `ZALO_APP_SECRET` | ❌ | Zalo App Secret |
| `LOG_LEVEL` | ❌ | 日志级别 (INFO/DEBUG) |

## 端点

| URL | 方法 | 描述 |
|-----|------|------|
| `/.netlify/functions/health` | GET | 健康检查 |
| `/.netlify/functions/zalo-webhook` | POST | Zalo → Respond.io |
| `/.netlify/functions/message` | POST | Respond.io → Zalo |

## 测试

```bash
# 健康检查
curl https://[site].netlify.app/.netlify/functions/health

# 模拟 Zalo 入站
curl -X POST https://[site].netlify.app/.netlify/functions/zalo-webhook \
  -H "Content-Type: application/json" \
  -d '{"sender":{"id":"USER_ID"},"event_name":"user_send_text","message":{"text":"Hello"}}'

# 模拟 Respond.io 出站
curl -X POST https://[site].netlify.app/.netlify/functions/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"contactId":"USER_ID","message":{"text":"Hello"}}'
```

## 日志

日志输出为 JSON 格式，可在 Netlify Functions 日志查看。

## 已支持

- 入站文字消息 (user_send_text)
- 出站文字消息
- Bearer token 认证

## 未支持

- 图片/语音/视频
- 模板消息
- OAuth 自动刷新