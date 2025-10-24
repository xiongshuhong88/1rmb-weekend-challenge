# 一块钱周末挑战 · Landing Page

首期活动的官方落地页，聚焦「48 小时挑战｜用一个周末赚到你的第一块钱」。页面以纯 HTML/CSS/JS 构建，支持一键上传至 Cloudflare Pages 或任意静态托管服务。

> ℹ️ **隐私说明**  
> 仓库中所有域名示例均为占位符 `https://your-domain.example`。部署前请替换为你自己的域名，避免泄露真实站点。

---

## ✨ 项目亮点

- **高转化 Hero 区**：热血标语 + 按钮组合（加入挑战 / 了解玩法 / 访问 GitHub），突出流程「选题 → MVP → 上线收款 → 复盘」。
- **活动状态组件**：导航下方展示当前期数、倒计时与开营状态，随时间自动更新。
- **核心价值区（New）**：三张卡片阐述开源建站教学、AI 剪辑内容教学、社群变现陪跑。
- **报名 & 社群信息**：二维码、常见问题、社群平台说明一页完成，引导扫码入群。
- **完整 SEO 支撑**：含 keywords、OG/Twitter 图、JSON-LD、`robots.txt`、`sitemap.xml`，便于搜索引擎收录。

---

## 🧱 技术栈与结构

| 文件 / 目录 | 说明 |
|-------------|------|
| `index.html` | 主页面结构与文案。 |
| `pages/` | 其他专题页与流程说明，按需扩展更多 HTML 页面。 |
| `assets/styles/styles.css` | 全局样式、响应式布局、色彩系统。 |
| `assets/scripts/main.js` | 倒计时、期数计算、状态提示逻辑。 |
| `assets/images/` | Hero/社群展示图、二维码与项目截图等静态资源。 |
| `docs/` | 社群公告、复盘等 Markdown 文档。 |
| `robots.txt` / `sitemap.xml` | 搜索引擎辅助文件。 |

项目完全无依赖，适合 fork 后按需修改。

---

## 🚀 本地预览

```bash
npm install -g serve   # 若尚未安装
serve .
# 或使用任意静态服务器打开 index.html
```

浏览器访问 `http://localhost:3000`（或终端提示的端口）即可查看效果。

---

## 🧰 开发与构建流程

```bash
npm install               # 安装开发依赖
npm run dev               # 本地预览（使用 http-server）
npm run lint              # HTML / CSS / JS 体检
npm run build             # 生成 dist/ 静态站
npm run package           # 打包 dist/ + release/*.zip
```

> `dist/` 与 `release/` 已加入 `.gitignore`，打包产物可在 `release/` 目录找到。

`config/event.json` 是站点的单一配置源，运行 `npm run build` / `npm run package` 会自动同步至 `assets/scripts/event-config.js` 并写入构建产物。

---

## ☁️ Cloudflare Pages 部署示例

1. 登录 Cloudflare → Pages → **Create project** → 选择 **Upload** 或 **Connect to Git**。  
2. 构建配置：  
   - Build command：`None`  
   - Build output directory：`/`（根目录）
3. 自定义域名：在 Pages 项目设置中添加你的域名（例如 `your-domain.example`），在 DNS 中创建相应 CNAME。
4. 开启强制 HTTPS，根据需要在 `_headers` / `_redirects` 中定制缓存策略。
5. 部署后检查：  
   - `https://your-domain.example/robots.txt`  
   - `https://your-domain.example/sitemap.xml`

> 也可以连接 GitHub 仓库，Cloudflare 会在每次 push 后自动构建。

---

## 🛠️ 自定义指南

- **文案与亮点**：主要在 `index.html` 与 `pages/` 下的各页面调整。期数与状态由 `assets/scripts/main.js` 自动计算，可调整基准时间或文案。
- **视觉元素**：替换 `assets/images/` 内的 `hero-*.jpg`、`wechat-qr.jpg` 等图片，建议保持 16:9 比例。
- **域名/链接**：将所有 `your-domain.example`、GitHub 地址换成你的真实链接。
- **配色 / 字体**：在 `assets/styles/styles.css` 顶部的 CSS 变量中快速替换品牌色；亦可引入自定义字体。

---

## 📦 数据与脚本

- `npm run supporters:sync`：从 `data/raw/` 中的报名 Excel 聚合高金额支持者，输出 `assets/data/supporters.json`。
- `scripts/`：收录配置生成、构建、打包等自动化脚本，可直接复用在 CI 或本地工具链。

---

## 🤖 Agent 协作手册

- [agents.md](agents.md) 汇总「一块钱周末挑战」48 小时闭环的角色职责、提示词与时间表，可直接拷贝到各类 AI 对话中。
- 建议把 `config/event.json`、`docs/SUMMARY.md` 与 `release/` 打包结果同步在手册里引用，便于 Agent 间共享上下文。

---

## 🔐 隐私保留

- 站点示例域名全部为占位符，避免泄露真实地址。
- 若将项目公开演示，请确认 `sitemap.xml`、`robots.txt`、Open Graph 图片均已替换为实际资源。

---

## 🤝 参与贡献

- 欢迎 Fork 并提交 Pull Request，一起优化文案、视觉或功能。
- 有任何问题或建议，可在 Issues 中讨论。
- 如果这个项目对你有帮助，欢迎在 GitHub Star 支持：`https://github.com/xiongshuhong88/1rmb-weekend-challenge`

---

## 🗂 文档索引

各期沉淀统一存放于 `docs/`，通过 [docs/SUMMARY.md](docs/SUMMARY.md) 可快速浏览社群公告、复盘与原始数据位置，Agent 手册位于项目根目录的 [agents.md](agents.md)。

---

让我们在 48 小时内，找到第一个愿意为你的作品买单的人。欢迎加入 **一块钱周末挑战**！💪
