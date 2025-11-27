/**
 * Minimal WeChat Pay backend template (JSAPI + Native QR).
 * - Do NOT commit real keys. Wire them via environment variables.
 * - This file is a starting point; add your own persistence, logging, and auth.
 *
 * Required env:
 *   WECHAT_APPID=wx...               // 服务号或小程序 appid
 *   WECHAT_MCHID=1900xxxx            // 商户号
 *   WECHAT_API_V3_KEY=...            // API v3 密钥
 *   WECHAT_MCH_CERT_SERIAL=...       // 商户证书序列号
 *   WECHAT_PRIVATE_KEY_PATH=/secure/path/apiclient_key.pem
 *   WECHAT_PLATFORM_CERT_PATH=/secure/path/wechatpay_platform_cert.pem
 *   WECHAT_NOTIFY_URL=https://yourdomain.com/api/notify
 *
 * Optional:
 *   PORT=3000
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const axios = require('axios');

const {
  WECHAT_APPID,
  WECHAT_MCHID,
  WECHAT_API_V3_KEY,
  WECHAT_MCH_CERT_SERIAL,
  WECHAT_PRIVATE_KEY_PATH,
  WECHAT_PLATFORM_CERT_PATH,
  WECHAT_NOTIFY_URL,
  PAY_AMOUNT_FEN,
  GROUP_QR_URL,
  QR_TOKEN_TTL_MS,
  QR_MAX_VIEWS
} = process.env;

function invariant(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

invariant(WECHAT_APPID, 'WECHAT_APPID required');
invariant(WECHAT_MCHID, 'WECHAT_MCHID required');
invariant(WECHAT_API_V3_KEY, 'WECHAT_API_V3_KEY required');
invariant(WECHAT_MCH_CERT_SERIAL, 'WECHAT_MCH_CERT_SERIAL required');
invariant(WECHAT_PRIVATE_KEY_PATH, 'WECHAT_PRIVATE_KEY_PATH required');
invariant(WECHAT_PLATFORM_CERT_PATH, 'WECHAT_PLATFORM_CERT_PATH required');
invariant(WECHAT_NOTIFY_URL, 'WECHAT_NOTIFY_URL required');

const PAYMENT_AMOUNT_FEN = Number.isFinite(Number(PAY_AMOUNT_FEN)) ? Number(PAY_AMOUNT_FEN) : 1000;
const TOKEN_TTL_MS = Number.isFinite(Number(QR_TOKEN_TTL_MS)) ? Number(QR_TOKEN_TTL_MS) : 10 * 60 * 1000;
const TOKEN_MAX_VIEWS = Math.max(1, Number.isFinite(Number(QR_MAX_VIEWS)) ? Number(QR_MAX_VIEWS) : 3);

const mchPrivateKey = fs.readFileSync(path.resolve(WECHAT_PRIVATE_KEY_PATH), 'utf8');
const platformCert = fs.readFileSync(path.resolve(WECHAT_PLATFORM_CERT_PATH), 'utf8');

const app = express();

// Notification needs raw body for signature verification.
app.use('/api/notify', express.raw({ type: 'application/json' }));
// Normal JSON parsing for other routes.
app.use(express.json());

// In-memory order store for demo purposes.
const orders = new Map();

function randomStr(len = 16) {
  return crypto.randomBytes(len).toString('hex');
}

function updateOrder(outTradeNo, data) {
  const current = orders.get(outTradeNo) || {};
  orders.set(outTradeNo, { ...current, ...data });
  return orders.get(outTradeNo);
}

function signRequest(method, urlPath, body = '') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomStr(8);
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  const signature = signer.sign(mchPrivateKey, 'base64');
  const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_MCHID}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${WECHAT_MCH_CERT_SERIAL}"`;
  return { authorization: auth, timestamp, nonceStr };
}

async function callWeChat({ method, path: urlPath, data }) {
  const body = data ? JSON.stringify(data) : '';
  const { authorization } = signRequest(method, urlPath, body);
  const resp = await axios({
    method,
    url: `https://api.mch.weixin.qq.com${urlPath}`,
    data: data || undefined,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'weekend-challenge-payment/0.1.0'
    },
    timeout: 8000
  });
  return resp.data;
}

function signJsapi(prepayId) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomStr(8);
  const pkg = `prepay_id=${prepayId}`;
  const message = `${WECHAT_APPID}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  const signature = signer.sign(mchPrivateKey, 'base64');
  return {
    appId: WECHAT_APPID,
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign: signature
  };
}

function verifyNotifySignature(signature, timestamp, nonce, body) {
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(message);
  verifier.end();
  return verifier.verify(platformCert, signature, 'base64');
}

function decryptResource(resource) {
  const { associated_data, nonce, ciphertext, tag } = resource;
  const key = Buffer.from(WECHAT_API_V3_KEY, 'utf8');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf8'));
  if (associated_data) {
    decipher.setAAD(Buffer.from(associated_data, 'utf8'));
  }
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const decoded = Buffer.concat([decipher.update(ciphertext, 'base64'), decipher.final()]);
  return JSON.parse(decoded.toString('utf8'));
}

app.post('/api/order', async (req, res) => {
  try {
    const { scene, openid, formData } = req.body || {};
    if (!scene || !['jsapi', 'native'].includes(scene)) {
      return res.status(400).json({ error: 'scene must be jsapi or native' });
    }
    if (scene === 'jsapi' && !openid) {
      return res.status(400).json({ error: 'openid required for jsapi' });
    }

    const outTradeNo = `wc${Date.now()}${Math.floor(Math.random() * 1000)}`;
    updateOrder(outTradeNo, {
      status: 'pending',
      formData,
      scene,
      amountFen: PAYMENT_AMOUNT_FEN,
      createdAt: Date.now(),
      tokenViews: 0
    });

    const basePayload = {
      appid: WECHAT_APPID,
      mchid: WECHAT_MCHID,
      description: '百万周末AI社区-报名费',
      out_trade_no: outTradeNo,
      notify_url: WECHAT_NOTIFY_URL,
      amount: { total: PAYMENT_AMOUNT_FEN, currency: 'CNY' }
    };

    if (scene === 'jsapi') {
      const payload = { ...basePayload, payer: { openid } };
      const resp = await callWeChat({ method: 'POST', path: '/v3/pay/transactions/jsapi', data: payload });
      const payParams = signJsapi(resp.prepay_id);
      return res.json({ mode: 'jsapi', outTradeNo, payParams });
    }

    // native
    const resp = await callWeChat({ method: 'POST', path: '/v3/pay/transactions/native', data: basePayload });
    return res.json({ mode: 'native', outTradeNo, code_url: resp.code_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'order_failed' });
  }
});

app.post('/api/notify', async (req, res) => {
  try {
    const signature = req.header('Wechatpay-Signature');
    const timestamp = req.header('Wechatpay-Timestamp');
    const nonce = req.header('Wechatpay-Nonce');
    const serial = req.header('Wechatpay-Serial');
    const rawBody = req.body.toString('utf8');

    if (!verifyNotifySignature(signature, timestamp, nonce, rawBody)) {
      return res.status(401).json({ code: 'SIGNATURE_ERROR' });
    }

    const event = JSON.parse(rawBody);
    const data = decryptResource(event.resource);
    const { out_trade_no: outTradeNo, trade_state: tradeState, transaction_id: transactionId } = data;
    const order = orders.get(outTradeNo) || {};
    const updates = {
      status: tradeState,
      transactionId,
      notifySerial: serial,
      paidAt: Date.now()
    };
    if (tradeState === 'SUCCESS' && !order.token) {
      updates.token = randomStr(12);
      updates.tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
      updates.tokenViews = 0;
    }
    updateOrder(outTradeNo, updates);

    return res.json({ code: 'SUCCESS', message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 'ERROR' });
  }
});

app.get('/api/orders/:outTradeNo', (req, res) => {
  const order = orders.get(req.params.outTradeNo);
  if (!order) return res.status(404).json({ error: 'not_found' });
  const response = {
    outTradeNo: req.params.outTradeNo,
    status: order.status,
    transactionId: order.transactionId,
    amountFen: order.amountFen,
    scene: order.scene
  };
  const now = Date.now();
  if (order.status === 'SUCCESS' && order.token && (!order.tokenExpiresAt || order.tokenExpiresAt > now)) {
    response.token = order.token;
    response.tokenExpiresAt = order.tokenExpiresAt;
  }
  res.json(response);
});

app.get('/api/orders/:outTradeNo/qr', (req, res) => {
  const outTradeNo = req.params.outTradeNo;
  const token = req.query.token;
  const order = orders.get(outTradeNo);
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (order.status !== 'SUCCESS') return res.status(403).json({ error: 'not_paid' });
  if (!order.token || !token || token !== order.token) {
    return res.status(403).json({ error: 'token_invalid' });
  }
  const now = Date.now();
  if (order.tokenExpiresAt && order.tokenExpiresAt < now) {
    return res.status(403).json({ error: 'token_expired' });
  }
  if (!GROUP_QR_URL) {
    return res.status(500).json({ error: 'qr_not_configured' });
  }
  const views = Number.isFinite(order.tokenViews) ? order.tokenViews : 0;
  if (views >= TOKEN_MAX_VIEWS) {
    return res.status(429).json({ error: 'token_view_limit' });
  }
  updateOrder(outTradeNo, { tokenViews: views + 1 });
  return res.json({
    image: GROUP_QR_URL,
    expiresAt: order.tokenExpiresAt,
    remainingViews: Math.max(0, TOKEN_MAX_VIEWS - views - 1)
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`WeChat Pay demo server running on http://0.0.0.0:${port}`);
});
