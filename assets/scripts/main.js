(function () {
  const yearEl = document.getElementById('y');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

(function () {
  const countdownBlocks = Array.from(document.querySelectorAll('[data-countdown]')).map(banner => {
    const elements = {
      title: banner.querySelector('[data-title]'),
      label: banner.querySelector('[data-label]'),
      note: banner.querySelector('[data-note]'),
      range: banner.querySelector('[data-range]'),
      days: banner.querySelector('[data-days]'),
      hours: banner.querySelector('[data-hours]'),
      minutes: banner.querySelector('[data-minutes]'),
      seconds: banner.querySelector('[data-seconds]')
    };
    if (!elements.days || !elements.hours || !elements.minutes || !elements.seconds){
      return null;
    }
    return { elements };
  }).filter(Boolean);

  const navEditionEl = document.getElementById('nav-edition');
  const statusTextEl = document.getElementById('status-text');
  const editionTemplateNodes = Array.from(document.querySelectorAll('[data-edition-template]'));
  if (!countdownBlocks.length && !navEditionEl && !statusTextEl && !editionTemplateNodes.length) return;

  const MS_SECOND = 1000;
  const MS_MINUTE = 60 * MS_SECOND;
  const MS_HOUR = 60 * MS_MINUTE;
  const MS_DAY = 24 * MS_HOUR;
  const WEEK_MS = 7 * MS_DAY;
  const EVENT_DURATION_MS = 52 * MS_HOUR;
  const START_WEEKDAY = 5; // Friday
  const START_HOUR_UTC = 12; // 20:00 Asia/Shanghai
  const BASE_START = Date.UTC(2025, 9, 17, START_HOUR_UTC, 0, 0, 0);

  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short'
  });

  function dateParts(date){
    const parts = dateFormatter.formatToParts(date);
    return {
      year: parts.find(p => p.type === 'year').value,
      month: parts.find(p => p.type === 'month').value,
      day: parts.find(p => p.type === 'day').value
    };
  }

  function formatRange(start, end){
    const s = dateParts(start);
    const e = dateParts(end);
    if (s.year === e.year && s.month === e.month){
      return `${s.year}年${s.month}月${s.day}日至${e.day}日`;
    }
    if (s.year === e.year){
      return `${s.year}年${s.month}月${s.day}日至${e.month}月${e.day}日`;
    }
    return `${s.year}年${s.month}月${s.day}日至${e.year}年${e.month}月${e.day}日`;
  }

  function computeUpcomingStart(now){
    const start = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      START_HOUR_UTC, 0, 0, 0
    ));
    let delta = START_WEEKDAY - now.getUTCDay();
    if (delta < 0) delta += 7;
    start.setUTCDate(start.getUTCDate() + delta);
    if (delta === 0 && now >= start){
      start.setUTCDate(start.getUTCDate() + 7);
    }
    return start;
  }

  function getWindow(now){
    const upcomingStart = computeUpcomingStart(now);
    const previousStart = new Date(upcomingStart.getTime() - WEEK_MS);
    const previousEnd = new Date(previousStart.getTime() + EVENT_DURATION_MS);

    if (now >= previousStart && now < previousEnd){
      return { mode: 'running', start: previousStart, end: previousEnd };
    }
    return { mode: 'upcoming', start: upcomingStart, end: new Date(upcomingStart.getTime() + EVENT_DURATION_MS) };
  }

  function pad(number){
    return String(number).padStart(2,'0');
  }

  const EDITION_PLACEHOLDER = /\{\{\s*n\s*\}\}/g;
  function applyEditionTemplates(edition){
    if (!editionTemplateNodes.length) return;
    editionTemplateNodes.forEach(node => {
      const template = node.getAttribute('data-edition-template');
      if (!template) return;
      const text = template.replace(EDITION_PLACEHOLDER, edition);
      if (node.tagName === 'TITLE'){
        node.textContent = text;
        document.title = text;
      } else if (node.dataset.editionAttribute){
        node.setAttribute(node.dataset.editionAttribute, text);
      } else {
        node.textContent = text;
      }
    });
  }

  function update(){
    const now = new Date();
    let window = getWindow(now);
    let target = window.mode === 'running' ? window.end : window.start;

    if (now >= target){
      window = getWindow(new Date());
      target = window.mode === 'running' ? window.end : window.start;
    }

    const diff = target.getTime() - now.getTime();
    const days = Math.max(0, Math.floor(diff / MS_DAY));
    const hours = Math.max(0, Math.floor((diff % MS_DAY) / MS_HOUR));
    const minutes = Math.max(0, Math.floor((diff % MS_HOUR) / MS_MINUTE));
    const seconds = Math.max(0, Math.floor((diff % MS_MINUTE) / MS_SECOND));

    countdownBlocks.forEach(({ elements }) => {
      if (elements.days) elements.days.textContent = pad(days);
      if (elements.hours) elements.hours.textContent = pad(hours);
      if (elements.minutes) elements.minutes.textContent = pad(minutes);
      if (elements.seconds) elements.seconds.textContent = pad(seconds);
    });

    const displayStart = window.start;
    const displayEnd = new Date(window.start.getTime() + 2 * MS_DAY);
    const formattedRange = formatRange(displayStart, displayEnd);
    countdownBlocks.forEach(({ elements }) => {
      if (elements.range) elements.range.textContent = formattedRange;
    });
    const edition = Math.max(1, Math.floor((window.start.getTime() - BASE_START) / WEEK_MS) + 1);
    applyEditionTemplates(edition);

    const isRunning = window.mode === 'running';
    countdownBlocks.forEach(({ elements }) => {
      if (elements.title){
        elements.title.textContent = isRunning ? '当前挑战' : '下一次挑战';
      }
      if (elements.label){
        elements.label.textContent = isRunning
          ? '挑战进行中：距离收队还有'
          : '距离下一次挑战还有';
      }
      if (elements.note){
        elements.note.textContent = isRunning
          ? '周日 24:00 收队（北京时间）'
          : '周五晚 20:00 开营 · 周日 24:00 收队（北京时间）';
      }
    });

    if (statusTextEl){
      const startParts = dateParts(window.start);
      const startWeekday = weekdayFormatter.format(window.start);
      if (window.mode === 'running'){
        const endParts = dateParts(window.end);
        const endWeekday = weekdayFormatter.format(window.end);
        statusTextEl.textContent = `📆 第${edition}期挑战进行中｜${endParts.month}月${endParts.day}日（${endWeekday}）24:00 收队，欢迎加入围观或复盘`;
      } else {
        statusTextEl.textContent = `📆 当前为第${edition}期活动（尚未开始）｜预计 ${startParts.month}月${startParts.day}日（${startWeekday}）20:00 开营，敬请期待！`;
      }
    }
  }

  update();
  setInterval(update, 1000);
})();

(function () {
  const container = document.querySelector('[data-supporter-list]');
  if (!container) return;

  const DATA_URL = 'assets/data/supporters.json';
  const fruitThemes = [
    { key: 'citrus', gradient: 'linear-gradient(135deg,#f97316 0%,#facc15 100%)', accent: 'rgba(255,255,255,0.45)' },
    { key: 'berry', gradient: 'linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%)', accent: 'rgba(255,255,255,0.5)' },
    { key: 'kiwi', gradient: 'linear-gradient(135deg,#4ade80 0%,#84cc16 100%)', accent: 'rgba(255,255,255,0.32)' },
    { key: 'dragonfruit', gradient: 'linear-gradient(135deg,#f9a8d4 0%,#fb7185 55%,#f43f5e 100%)', accent: 'rgba(255,255,255,0.55)' },
    { key: 'blueberry', gradient: 'linear-gradient(135deg,#1e3a8a 0%,#4338ca 100%)', accent: 'rgba(255,255,255,0.42)' },
    { key: 'grape', gradient: 'linear-gradient(135deg,#7c3aed 0%,#c026d3 100%)', accent: 'rgba(255,255,255,0.4)' },
    { key: 'watermelon', gradient: 'linear-gradient(135deg,#f87171 0%,#fb7185 45%,#facc15 100%)', accent: 'rgba(255,255,255,0.5)' },
    { key: 'mango', gradient: 'linear-gradient(135deg,#fbbf24 0%,#fb923c 55%,#f97316 100%)', accent: 'rgba(255,255,255,0.45)' }
  ];

  const inlineDataEl = document.getElementById('supporters-data');
  let inlineData = null;
  if (inlineDataEl) {
    try {
      inlineData = JSON.parse(inlineDataEl.textContent);
    } catch (error) {
      console.error('Failed to parse inline supporters data', error);
    }
  }

  const isHttpProtocol = window.location.protocol === 'http:' || window.location.protocol === 'https:';

  function setPlaceholder(message) {
    container.innerHTML = '';
    const hint = document.createElement('p');
    hint.className = 'muted supporters__placeholder';
    hint.setAttribute('data-supporter-placeholder', '');
    hint.textContent = message;
    container.appendChild(hint);
  }

  function hashValue(name, seed = 0) {
    const str = `${name || ''}${seed}`;
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function themeFor(name) {
    return fruitThemes[hashValue(name, 557) % fruitThemes.length];
  }

  function rotationFor(name) {
    return (hashValue(name, 911) % 60) - 30;
  }

  function formatAmount(amount) {
    const value = Number.isFinite(amount) ? amount : 0;
    return `¥${value.toFixed(2)}`;
  }

  function createCard(supporter) {
    const card = document.createElement('article');
    card.className = 'supporter-card';

    const avatar = document.createElement('div');
    avatar.className = 'supporter-card__avatar';
    const theme = themeFor(supporter.name);
    avatar.style.setProperty('--avatar-gradient', theme.gradient);
    avatar.dataset.fruit = theme.key;
    avatar.style.setProperty('--avatar-rotation', `${rotationFor(supporter.name)}deg`);
    if (theme.accent) {
      avatar.style.setProperty('--fruit-accent', theme.accent);
    }

    const info = document.createElement('div');
    info.className = 'supporter-card__info';

    const nameEl = document.createElement('div');
    nameEl.className = 'supporter-card__name';
    nameEl.textContent = supporter.name;

    const amountEl = document.createElement('div');
    amountEl.className = 'supporter-card__amount';
    amountEl.textContent = formatAmount(Number(supporter.amount));

    info.appendChild(nameEl);
    info.appendChild(amountEl);

    card.appendChild(avatar);
    card.appendChild(info);
    return card;
  }

  function renderSupporters(list) {
    const normalized = Array.isArray(list)
      ? list
          .filter(item => item && item.name && Number(item.amount) >= 10)
          .map(item => ({
            name: String(item.name).trim(),
            amount: Number(item.amount)
          }))
          .sort((a, b) => {
            if (b.amount !== a.amount) return b.amount - a.amount;
            return a.name.localeCompare(b.name, 'zh-Hans', { sensitivity: 'base' });
          })
      : [];

    if (!normalized.length) {
      setPlaceholder('目前还没有符合条件的支持者记录，欢迎成为第一位支持者！');
      return;
    }

    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    normalized.forEach(item => {
      fragment.appendChild(createCard(item));
    });
    container.appendChild(fragment);
  }

  if (Array.isArray(inlineData) && inlineData.length) {
    renderSupporters(inlineData);
  } else {
    setPlaceholder('名单加载中，稍等片刻…');
  }

  if (!isHttpProtocol) {
    if (!Array.isArray(inlineData) || !inlineData.length) {
      setPlaceholder('支持者名单预览需要通过本地服务器访问或等待数据同步。');
    }
    return;
  }

  fetch(DATA_URL)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load supporters: ${response.status}`);
      return response.json();
    })
    .then(renderSupporters)
    .catch(error => {
      console.error(error);
      if (!Array.isArray(inlineData) || !inlineData.length) {
        setPlaceholder('支持者名单暂时无法获取，请稍后再试。');
      }
    });
})();
