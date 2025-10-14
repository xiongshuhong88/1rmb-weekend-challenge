(function () {
  const yearEl = document.getElementById('y');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

(function () {
  const rangeEl = document.getElementById('challenge-range');
  const daysEl = document.getElementById('countdown-days');
  const hoursEl = document.getElementById('countdown-hours');
  const minutesEl = document.getElementById('countdown-minutes');
  const secondsEl = document.getElementById('countdown-seconds');
  if (!rangeEl || !daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  const titleEl = document.getElementById('countdown-title');
  const labelEl = document.getElementById('countdown-label');
  const noteEl = document.getElementById('countdown-note');

  const MS_SECOND = 1000;
  const MS_MINUTE = 60 * MS_SECOND;
  const MS_HOUR = 60 * MS_MINUTE;
  const MS_DAY = 24 * MS_HOUR;
  const WEEK_MS = 7 * MS_DAY;
  const EVENT_DURATION_MS = 52 * MS_HOUR;
  const START_WEEKDAY = 5; // Friday
  const START_HOUR_UTC = 12; // 20:00 Asia/Shanghai

  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
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

    daysEl.textContent = pad(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);

    const displayStart = window.start;
    const displayEnd = new Date(window.start.getTime() + 2 * MS_DAY);
    rangeEl.textContent = formatRange(displayStart, displayEnd);
    if (titleEl){
      titleEl.textContent = window.mode === 'running' ? '当前挑战' : '下一次挑战';
    }
    if (labelEl){
      labelEl.textContent = window.mode === 'running'
        ? '挑战进行中：距离收队还有'
        : '距离下一次挑战还有';
    }
    if (noteEl){
      noteEl.textContent = window.mode === 'running'
        ? '周日 24:00 收队（北京时间）'
        : '周五晚 20:00 开营 · 周日 24:00 收队（北京时间）';
    }
  }

  update();
  setInterval(update, 1000);
})();
