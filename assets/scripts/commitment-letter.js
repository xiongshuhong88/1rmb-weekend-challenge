(function () {
  if (!document.body || !document.body.classList.contains('commitment-page')) return;

  const $ = (selector) => document.querySelector(selector);
  const nameEl = $('#name');
  const dateEl = $('#date');
  const goalEl = $('#goal');
  const dreamEl = $('#dream');
  const checkEls = ['#c1', '#c2', '#c3', '#c4'].map((q) => document.querySelector(q));
  const pad = document.getElementById('signPad');
  const previewDialog = document.getElementById('preview');
  const out = document.getElementById('out');
  const genBtn = document.getElementById('gen');
  const downloadBtn = document.getElementById('dl');
  const saveBtn = document.getElementById('save');
  const shareBtn = document.getElementById('share');
  const closeBtn = document.getElementById('closePv');
  const shareStatus = document.getElementById('shareStatus');

  if (!pad || !out || !genBtn) return;

  function updateShareStatus(text, state) {
    if (!shareStatus) return;
    shareStatus.textContent = text;
    if (state) {
      shareStatus.dataset.state = state;
    } else {
      shareStatus.removeAttribute('data-state');
    }
  }

  function setDownloadEnabled(enabled) {
    if (downloadBtn) downloadBtn.disabled = !enabled;
    if (shareBtn) shareBtn.disabled = !enabled;
    if (!enabled) {
      updateShareStatus('提示：先点“生成承诺卡”，即可启用下载与分享按钮。');
    }
  }
  setDownloadEnabled(false);

  (function fillToday() {
    if (!dateEl) return;
    const now = new Date();
    const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    dateEl.value = iso;
  })();

  // Signature pad logic.
  const ctx = pad.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = '#d1fae5';
  let drawing = false;
  let lastPoint = null;

  function pointerPos(e) {
    const rect = pad.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * (pad.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (pad.height / rect.height)
      };
    }
    return {
      x: (e.clientX - rect.left) * (pad.width / rect.width),
      y: (e.clientY - rect.top) * (pad.height / rect.height)
    };
  }

  function startDraw(e) {
    drawing = true;
    lastPoint = pointerPos(e);
    e.preventDefault();
  }

  function draw(e) {
    if (!drawing) return;
    const current = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    lastPoint = current;
    e.preventDefault();
  }

  function endDraw() {
    drawing = false;
    lastPoint = null;
  }

  pad.addEventListener('mousedown', startDraw);
  pad.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', endDraw);
  pad.addEventListener('touchstart', startDraw, { passive: false });
  pad.addEventListener('touchmove', draw, { passive: false });
  pad.addEventListener('touchend', endDraw);

  $('#clearSig')?.addEventListener('click', () => ctx.clearRect(0, 0, pad.width, pad.height));
  closeBtn?.addEventListener('click', () => previewDialog?.close());

  function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
    const words = (text || '').toString().replace(/\n/g, ' ').split(/\s+/);
    let line = '';
    for (let i = 0; i < words.length; i += 1) {
      const testLine = `${line}${words[i]} `;
      const metrics = context.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        context.fillText(line, x, y);
        line = `${words[i]} `;
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, y);
    return y + lineHeight;
  }

  const octx = out.getContext('2d');

  function paintCard() {
    const W = out.width;
    const H = out.height;
    const gradient = octx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#0b0f1a');
    gradient.addColorStop(1, '#0f172a');
    octx.fillStyle = gradient;
    octx.fillRect(0, 0, W, H);

    function glow(cx, cy, r, color) {
      const g = octx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = g;
      octx.beginPath();
      octx.arc(cx, cy, r, 0, Math.PI * 2);
      octx.fill();
    }

    glow(200, 100, 360, 'rgba(110,243,165,.22)');
    glow(900, 260, 380, 'rgba(139,92,246,.18)');

    const margin = 64;
    const radius = 28;
    const cardX = margin;
    const cardY = margin;
    const cardW = W - margin * 2;
    const cardH = H - margin * 2;
    octx.fillStyle = 'rgba(255,255,255,0.06)';
    octx.strokeStyle = 'rgba(255,255,255,0.18)';
    octx.lineWidth = 2;
    roundRect(octx, cardX, cardY, cardW, cardH, radius, true, true);

    octx.fillStyle = '#e6edf3';
    octx.font = '700 46px "PingFang SC", Inter, system-ui, sans-serif';
    octx.fillText('《百万周末AI社区》承诺书', cardX + 38, cardY + 82);

    octx.strokeStyle = 'rgba(255,255,255,.14)';
    octx.lineWidth = 1;
    octx.beginPath();
    octx.moveTo(cardX + 36, cardY + 104);
    octx.lineTo(cardX + cardW - 36, cardY + 104);
    octx.stroke();

    const tx = cardX + 42;
    const tw = cardW - 84;
    const nm = nameEl?.value?.trim() || '未署名';
    const dt = dateEl?.value || '____-__-__';
    const goalText = goalEl?.value || '—';
    const dreamText = dreamEl?.value || '—';
    const items = [
      checkEls[0]?.checked ? '每天与 AI 对话 ≥ 50 次，边做边学。' : null,
      checkEls[1]?.checked ? '先跑通闭环，不求完美；真实用户是最好的导师。' : null,
      checkEls[2]?.checked ? '48 小时内完成一个 MVP（可演示/可下单/可体验）。' : null,
      checkEls[3]?.checked ? '在社群内透明分享进展与下一步计划。' : null
    ].filter(Boolean);
    let ty = cardY + 150;

    octx.font = '700 40px "PingFang SC", Inter, system-ui, sans-serif';
    octx.fillStyle = '#f8fafc';
    ty = drawWrappedText(octx, nm, tx, ty, tw, 44);
    ty += 6;
    octx.font = '600 30px "PingFang SC", Inter, system-ui, sans-serif';
    octx.fillStyle = '#cbd5ff';
    ty = drawWrappedText(octx, `日期：${dt}`, tx, ty, tw, 36);

    octx.fillStyle = '#93c5fd';
    octx.font = '500 26px "PingFang SC", Inter, system-ui, sans-serif';
    ty = drawWrappedText(octx, '本次挑战我要完成的项目：', tx, ty + 12, tw, 34);
    octx.fillStyle = '#e2e8f0';
    octx.font = '400 26px "PingFang SC", Inter, system-ui, sans-serif';
    ty = drawWrappedText(octx, goalText, tx, ty, tw, 34);

    octx.fillStyle = '#93c5fd';
    octx.font = '500 26px "PingFang SC", Inter, system-ui, sans-serif';
    ty = drawWrappedText(octx, '我期望达成的结果：', tx, ty + 10, tw, 34);
    octx.fillStyle = '#e2e8f0';
    octx.font = '400 26px "PingFang SC", Inter, system-ui, sans-serif';
    ty = drawWrappedText(octx, dreamText, tx, ty, tw, 34);

    ty += 24;
    octx.font = '600 28px "PingFang SC", Inter, system-ui, sans-serif';
    octx.fillStyle = '#a5b4fc';
    octx.fillText('我的承诺', tx, ty);
    octx.font = '400 26px "PingFang SC", Inter, system-ui, sans-serif';
    octx.fillStyle = '#dbeafe';
    items.forEach((text) => {
      ty = drawWrappedText(octx, `· ${text}`, tx, ty + 32, tw, 36);
    });

    const signH = 220;
    const gap = 26;
    const sX = tx;
    const sY = cardY + cardH - signH - gap;
    const sW = tw;
    const sH = signH;
    octx.strokeStyle = 'rgba(255,255,255,.18)';
    octx.lineWidth = 2;
    roundRect(octx, sX, sY, sW, sH, 18, false, true);
    octx.font = '500 22px "PingFang SC"';
    octx.fillStyle = '#9fb0c2';
    octx.fillText('签名（Sign）：', sX + 16, sY + 34);
    octx.fillText('百万周末AI社区 · MillionWeekend.com', sX + sW - 520, sY + sH - 14);

    const scale = Math.min((sW - 32) / pad.width, (sH - 64) / pad.height);
    const sigW = pad.width * scale;
    const sigH = pad.height * scale;
    const sigX = sX + 16;
    const sigY = sY + 50;
    octx.drawImage(pad, sigX, sigY, sigW, sigH);

    octx.fillStyle = '#6ef3a5';
    octx.font = '700 22px Inter, system-ui';
    octx.fillText('MillionWeekend · 48H', cardX + cardW - 240, cardY + 40);
  }

  function roundRect(context, x, y, w, h, r, fill, stroke) {
    const radius =
      typeof r === 'number'
        ? { tl: r, tr: r, br: r, bl: r }
        : Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, r);
    context.beginPath();
    context.moveTo(x + radius.tl, y);
    context.lineTo(x + w - radius.tr, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius.tr);
    context.lineTo(x + w, y + h - radius.br);
    context.quadraticCurveTo(x + w, y + h, x + w - radius.br, y + h);
    context.lineTo(x + radius.bl, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius.bl);
    context.lineTo(x, y + radius.tl);
    context.quadraticCurveTo(x, y, x + radius.tl, y);
    context.closePath();
    if (fill) context.fill();
    if (stroke) context.stroke();
  }

  function triggerDownload() {
    const link = document.createElement('a');
    const filename = `承诺书_${nameEl?.value || '未署名'}.png`;
    link.download = filename;
    link.href = out.toDataURL('image/png');
    link.click();
  }

  async function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('无法生成图片数据'));
      }, 'image/png');
    });
  }

  async function shareImage() {
    const blob = await canvasToBlob(out);
    const filename = `承诺书_${nameEl?.value || '未署名'}.png`;

    const trySystemShare = async () => {
      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '百万周末AI社区 · 承诺书',
            text: '我已经签下承诺书，周末一起来冲！'
          });
          return true;
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('system share failed', err);
        }
      }
      return false;
    };

    const tryClipboard = async () => {
      if (!(navigator.clipboard && window.ClipboardItem)) return false;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
      } catch (err) {
        console.warn('clipboard write failed', err);
        return false;
      }
    };

    if (await trySystemShare()) {
      return '已触发系统分享，选择微信好友完成发送。';
    }
    if (await tryClipboard()) {
      return '图片已复制到剪贴板，粘贴到微信聊天即可。';
    }

    triggerDownload();
    throw new Error('浏览器不支持直接分享，已自动下载图片，请从相册发送给微信好友。');
  }

  genBtn.addEventListener('click', (e) => {
    e.preventDefault();
    paintCard();
    previewDialog?.showModal();
    setDownloadEnabled(true);
    updateShareStatus('图片已生成，点击上方按钮即可下载或复制到微信。', 'success');
  });

  saveBtn?.addEventListener('click', triggerDownload);
  downloadBtn?.addEventListener('click', triggerDownload);

  shareBtn?.addEventListener('click', async () => {
    if (shareBtn.disabled) return;
    updateShareStatus('正在准备图片...', 'info');
    try {
      const message = await shareImage();
      updateShareStatus(message, 'success');
    } catch (err) {
      updateShareStatus(err.message || '分享失败，请重试或使用下载按钮。', 'error');
    }
  });
})();
