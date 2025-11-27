# 微信支付后端示例（JSAPI + Native 二维码）

> 仅为模板，请不要提交真实密钥。请在商户平台重置泄露的密钥后，再使用新的密钥通过环境变量注入。

## 作用
- 微信内：调用 `/v3/pay/transactions/jsapi`，返回 JSAPI 二次签名参数。
- PC/非微信：调用 `/v3/pay/transactions/native`，返回 `code_url` 用于生成二维码。
- `/api/notify` 验签 + 解密通知，更新订单状态（示例以内存存储，请换成数据库）。

## 依赖
```bash
npm install express axios
```
> 如果你想用 SDK，可替换为 `wechatpay-node-v3`，这里演示了最小签名/验签逻辑，方便调试。

## 运行
1. 准备环境变量（示例 `.env.local`，不要提交到仓库）：
   ```bash
   WECHAT_APPID=wx_xxx               # 服务号或小程序 appid
   WECHAT_MCHID=1900xxxxxx
   WECHAT_API_V3_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   WECHAT_MCH_CERT_SERIAL=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   WECHAT_PRIVATE_KEY_PATH=/secure/apiclient_key.pem
   WECHAT_PLATFORM_CERT_PATH=/secure/wechatpay_platform_cert.pem
   WECHAT_NOTIFY_URL=https://yourdomain.com/api/notify
   PAY_AMOUNT_FEN=1000
   GROUP_QR_URL=https://your-priv-oss.com/mw-group-qr.png
   QR_TOKEN_TTL_MS=600000
   QR_MAX_VIEWS=3
   PORT=3000
   ```
2. 在服务器放置商户私钥、微信平台证书（勿放仓库），路径与环境变量一致。
3. 运行：
   ```bash
   node server/payment-server.js
   ```
4. 将域名 `https://sightx.top` 配置到商户平台 JSAPI 授权目录/回调，`/api/notify` 需公网可访问。

## 前端串联要点
- 判断 UA：微信内 -> `scene: 'jsapi'`；否则 -> `scene: 'native'`（返回 `code_url` 渲染二维码）。
- JSAPI 调起：
  ```js
  WeixinJSBridge.invoke('getBrandWCPayRequest', payParams, (res) => {
    // ok / cancel / fail，之后可轮询 /api/orders/{outTradeNo}
  });
  ```
- Native：用 `code_url` 做二维码，同时轮询 `/api/orders/{outTradeNo}` 查状态。
- 支付成功后从 `/api/orders/{outTradeNo}` 拿到一次性 `token`，再用 `/api/orders/{outTradeNo}/qr?token=xxx` 取微信群二维码（`QR_TOKEN_TTL_MS` 控制有效期，`QR_MAX_VIEWS` 限制次数）。

## 你需要补全的部分
- 订单持久化：把内存 Map 替换为数据库（如 MySQL/SQLite/Redis）。
- 获取 `openid`：微信内需先做 OAuth，前端带回 `openid`。
- 金额校验：金额改为后端固定配置，前端不可自定义。
- 日志 & 风控：记录下单/通知原文；处理重复通知；必要时实现关单、退款；群二维码建议定期轮换。
