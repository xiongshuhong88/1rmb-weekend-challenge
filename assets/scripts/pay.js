(function () {
  const payButton = document.getElementById('pay-button');
  const statusEl = document.getElementById('pay-status');
  const progressEl = document.getElementById('pay-progress');
  const qrBox = document.getElementById('qr-box');
  const qrImg = document.getElementById('qr-img');
  const qrHint = document.getElementById('qr-hint');
  const codeUrlRow = document.getElementById('code-url-row');
  const codeUrlEl = document.getElementById('code-url');
  const sceneEl = document.getElementById('pay-scene');
  const noteEl = document.getElementById('pay-note');

  if (!payButton || !statusEl) return;

  const params = new URLSearchParams(window.location.search);
  const openid = params.get('openid') || window.WX_OPENID || '';
  const isWeChat = /MicroMessenger/i.test(window.navigator.userAgent);
  const supportsJsapi = isWeChat && !!openid;
  const scene = supportsJsapi ? 'jsapi' : 'native';

  let pollTimer = null;
  let currentOrder = null;

  if (sceneEl) {
    sceneEl.textContent = supportsJsapi ? '微信内直接支付' : '扫码支付';
  }
  if (!supportsJsapi && isWeChat && noteEl) {
    noteEl.textContent = '当前未检测到 openid，将使用扫码支付。如需免扫码，请通过微信 OAuth 获取 openid 后再次打开本页。';
  }

  function setButtonState(loading) {
    payButton.disabled = loading;
    payButton.textContent = loading ? '处理中…' : '立即支付并获取二维码';
  }

  function setStatus(text, tone = 'info') {
    statusEl.textContent = text;
    statusEl.className = `payment-status payment-status--${tone}`;
  }

  function setProgress(text) {
    if (progressEl) progressEl.textContent = text;
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function resetVisuals() {
    qrBox.hidden = true;
    qrImg.removeAttribute('src');
    qrImg.alt = '二维码';
    qrHint.textContent = '支付二维码生成中…';
    if (codeUrlRow) codeUrlRow.hidden = true;
    if (codeUrlEl) codeUrlEl.textContent = '';
  }

  function renderNativeQr(codeUrl) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(codeUrl)}`;
    qrImg.src = qrUrl;
    qrImg.alt = '支付二维码';
    if (codeUrlRow && codeUrlEl) {
      codeUrlRow.hidden = false;
      codeUrlEl.textContent = codeUrl;
    }
    qrHint.textContent = '请用微信扫码支付，成功后这里会自动替换为微信群二维码。';
    qrBox.hidden = false;
  }

  async function fetchGroupQr(outTradeNo, token) {
    try {
      const resp = await fetch(`/api/orders/${outTradeNo}/qr?token=${encodeURIComponent(token)}`);
      if (!resp.ok) {
        throw new Error('qr_fetch_failed');
      }
      const data = await resp.json();
      if (data.image) {
        qrImg.src = data.image;
        qrImg.alt = '微信群二维码';
        qrHint.textContent = data.expiresAt
          ? '二维码已解锁，请尽快扫码入群（有效期 10 分钟内，可在后端配置调整）。'
          : '二维码已解锁，请尽快扫码入群。';
        qrBox.hidden = false;
        setStatus('支付成功，二维码已解锁。', 'success');
        setButtonState(false);
      } else {
        throw new Error('qr_missing');
      }
    } catch (err) {
      console.error(err);
      setStatus('支付成功，但二维码获取失败，请联系管理员或稍后重试。', 'warn');
      setButtonState(false);
    }
  }

  async function pollOrder(outTradeNo) {
    try {
      const resp = await fetch(`/api/orders/${outTradeNo}`);
      if (!resp.ok) throw new Error('status_fetch_failed');
      const data = await resp.json();
      if (data.status === 'SUCCESS') {
        stopPoll();
        setProgress('支付成功，正在获取群二维码…');
        if (data.token) {
          await fetchGroupQr(outTradeNo, data.token);
        } else {
          setStatus('支付成功，等待服务器下发群二维码，请稍后重试。', 'warn');
          setButtonState(false);
        }
        return;
      }
      if (['CLOSED', 'REVOKED', 'REFUND', 'PAY_ERROR'].includes(data.status)) {
        stopPoll();
        setStatus(`订单状态：${data.status}，可重新发起支付。`, 'warn');
        setButtonState(false);
        return;
      }
      setProgress('订单已创建，等待支付结果…');
    } catch (err) {
      console.error(err);
      setStatus('查询订单失败，请稍后重试或联系管理员。', 'warn');
    }
  }

  function callWeChatPay(payParams) {
    return new Promise((resolve, reject) => {
      function invokePay() {
        window.WeixinJSBridge.invoke('getBrandWCPayRequest', payParams, res => {
          const msg = res && res.err_msg ? res.err_msg : '';
          if (msg === 'get_brand_wcpay_request:ok') {
            resolve();
          } else if (msg === 'get_brand_wcpay_request:cancel') {
            reject(new Error('用户取消支付'));
          } else {
            reject(new Error(msg || '支付失败'));
          }
        });
      }

      if (typeof window.WeixinJSBridge === 'undefined') {
        document.addEventListener('WeixinJSBridgeReady', invokePay, { once: true });
      } else {
        invokePay();
      }
    });
  }

  async function startPay() {
    resetVisuals();
    stopPoll();
    setButtonState(true);
    setStatus('正在创建订单…', 'info');
    setProgress(scene === 'jsapi' ? '准备微信支付…' : '准备生成扫码支付二维码…');

    try {
      const payload = { scene };
      if (scene === 'jsapi') {
        payload.openid = openid;
      }
      const resp = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        throw new Error('order_failed');
      }
      const data = await resp.json();
      currentOrder = { outTradeNo: data.outTradeNo, scene };
      setProgress('订单已创建，等待支付完成…');

      if (scene === 'native' && data.code_url) {
        renderNativeQr(data.code_url);
      }

      pollOrder(currentOrder.outTradeNo);
      pollTimer = setInterval(() => pollOrder(currentOrder.outTradeNo), 2000);

      if (scene === 'jsapi' && data.payParams) {
        callWeChatPay(data.payParams).catch(err => {
          console.warn(err);
          setStatus(err.message || '支付未完成，请重新尝试。', 'warn');
          setButtonState(false);
        });
      } else if (scene === 'native') {
        setStatus('请扫码支付，支付成功后会自动显示群二维码。', 'info');
      }
    } catch (err) {
      console.error(err);
      setStatus('下单失败，请稍后重试或联系管理员。', 'error');
      setButtonState(false);
    }
  }

  payButton.addEventListener('click', startPay);
  window.addEventListener('beforeunload', stopPoll);
})();
