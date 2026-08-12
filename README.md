# 时砾 · 日程管理网页

一个纯前端、零框架、可离线运行的日程管理单页应用，现已支持**云端多设备同步**。

功能模块：总览仪表盘、日历视图、待办清单、番茄时钟、习惯打卡、便签、目标倒计时、数据管理。

---

## 目录结构

```
schedule-manager/
├─ index.html                 # 入口（直接浏览器打开即可用）
├─ assets/
│  ├─ css/style.css
│  └─ js/
│     ├─ store.js             # 数据层（localStorage + 同步钩子）
│     ├─ utils.js             # 通用工具（toast/弹窗/SVG 图表）
│     ├─ calendar.js tasks.js pomodoro.js habits.js notes.js dashboard.js data.js
│     ├─ app.js               # 主程序（导航/主题/时钟）
│     └─ sync.js              # 云端同步模块（前端）
└─ api/                      # Vercel Serverless 函数（后端，需配置环境变量）
   ├─ auth.js                 # 注册 / 登录
   ├─ data.js                 # 拉取 / 保存用户数据（需登录）
   ├─ health.js               # 健康检查
   └─ lib/{upstash,auth,http}.js   # Redis 封装 / 认证 / HTTP 辅助
```

## 本地运行（仅前端）

直接双击 `index.html` 即可。未登录时数据只存在本机浏览器，所有功能均可用。

> 注意：本地以 `file://` 打开时，`/api/*` 接口无法调用（需要 Vercel 服务端），因此「云端同步」功能仅在部署后可用。

---

## 后端：云端多设备同步

同步能力由 **Vercel Serverless Functions + Upstash Redis** 提供，零额外 npm 依赖（用内置 `fetch` 直接调 Upstash REST API）。

- 每个用户的数据整体存为一个 JSON 块（与前端 localStorage 结构一致）。
- 注册/登录使用邮箱 + 密码（scrypt 加盐哈希），登录 token 为 HMAC 签名、30 天有效。
- 登录后：自动从云端拉取数据覆盖本地；此后本地任何改动都会防抖（1.2 秒）推送到云端。换设备登录即可恢复。

### 1. 创建 Upstash Redis（免费）

1. 打开 https://upstash.com ，用 GitHub 登录。
2. 进入 **Console → Create Database**，填名字（如 `schedule-manager`），地区选离你近的，**类型选 `Regional`**，套餐选 **Free**。
3. 创建后进入数据库详情页，复制：
   - `UPSTASH_REDIS_REST_URL`（形如 `https://xxx.upstash.io`）
   - `UPSTASH_REDIS_REST_TOKEN`（形如 `Axxx...`）

### 2. 在 Vercel 配置环境变量

1. 打开 Vercel 项目 **Settings → Environment Variables**。
2. 新增以下 3 个变量（Environment 全选 Production / Preview / Development）：

| Key | 说明 | 取值 |
|-----|------|------|
| `UPSTASH_REDIS_REST_URL` | Upstash REST 地址 | 第 1 步复制的 URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST 令牌 | 第 1 步复制的 Token |
| `SYNC_SECRET` | 用于签名登录 token 的密钥 | 自己生成一段随机字符串，例如 `openssl rand -hex 32` 的输出 |

3. 保存后，**必须重新部署一次**（Deployments → 最新记录 → Redeploy，或推送一次代码），环境变量才生效。

### 3. 验证

部署完成后，访问 `https://<你的域名>/api/health` ，返回 `{"ok":true,...}` 即接口通。

命令行自测（把 `YOUR_DOMAIN` 和变量换成你的）：

```bash
# 健康检查
curl https://YOUR_DOMAIN/api/health

# 注册
curl -X POST https://YOUR_DOMAIN/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"action":"register","email":"you@example.com","pass":"secret1"}'

# 用返回的 token 拉取数据
curl https://YOUR_DOMAIN/api/data -H "Authorization: Bearer <TOKEN>"
```

---

## 部署

推送到 GitHub 仓库 `TO-FULL/schedule-manager` 的 `main` 分支即自动触发 Vercel 部署（静态文件 + `api/` 函数共同托管）。

注意：本项目**不需要** `package.json` 或构建步骤；Vercel 自动把根目录作为静态站点，并把 `api/` 作为 Serverless Functions 运行。

## 隐私

- 未登录：数据仅存于本机浏览器 localStorage，不上传任何服务器。
- 登录后：数据加密传输并存放在你自己的 Upstash Redis 实例，仅你本人凭密码可访问。
