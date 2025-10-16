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
  if (!countdownBlocks.length && !navEditionEl && !statusTextEl) return;

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
    if (navEditionEl){
      navEditionEl.textContent = ` · 第${edition}期`;
    }

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
