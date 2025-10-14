# 一块钱周末挑战 Landing Page

静态单页网站，包含海报展示、社群信息、FAQ 以及报名方式二维码，适用于在 Cloudflare Pages 上快速部署到 `https://weekend.sightx.top/`。

## 主要功能
- Hero 区展示周末挑战核心信息与配图。
- 动态活动安排、社群场景图和常见问题。
- 公众号二维码图片，方便扫码入群。
- SEO 加强：Open Graph、Twitter Card、结构化数据、`robots.txt` 与 `sitemap.xml`。

## 本地预览
```bash
npx serve .
```
或使用任何静态文件服务器打开 `index.html`。

## 部署到 Cloudflare Pages
1. 登录 Cloudflare → Pages → Create project → Upload/Connect to Git。
2. 选择该目录，Build command 设为 `None`，Build output directory 设为根目录（`/`）。
3. 部署后在 Pages 项目设置中绑定自定义域名 `weekend.sightx.top`，按提示在 Cloudflare DNS 中添加 CNAME 记录。
4. 确保强制 HTTPS 开启，缓存策略使用「Standard」。若需更细缓存控制，可在 `_headers` 中自定义。
5. 验证 `https://weekend.sightx.top/robots.txt` 与 `https://weekend.sightx.top/sitemap.xml` 可访问。

## 文件说明
- `index.html`：主页面。
- `hero-*.png`：页面展示用配图。
- `wechat-qr.jpg`：公众号二维码。
- `robots.txt` / `sitemap.xml`：搜索引擎辅助文件。

若需自动部署，可以结合 Git 仓库，Cloudflare 会在每次 push 时自动构建并更新。
