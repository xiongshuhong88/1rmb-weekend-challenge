(function () {
  const placeholders = document.querySelectorAll('[data-countdown-placeholder]');
  if (!placeholders.length) return;

  const TEMPLATE_HTML = `
<div aria-live="polite" class="countdown-banner" data-countdown role="region">
  <div class="countdown-banner__inner">
    <div class="countdown-banner__title"><span data-title>下一次挑战</span>：<span data-range>--</span></div>
    <div class="countdown-banner__label" data-label>距离下一次挑战还有</div>
    <div class="countdown-banner__timer">
      <div class="countdown-segment">
        <span data-days>--</span>
        <small>天</small>
      </div>
      <div class="countdown-segment">
        <span data-hours>--</span>
        <small>小时</small>
      </div>
      <div class="countdown-segment">
        <span data-minutes>--</span>
        <small>分钟</small>
      </div>
      <div class="countdown-segment">
        <span data-seconds>--</span>
        <small>秒</small>
      </div>
    </div>
    <div class="countdown-banner__note" data-note>周五晚 20:00 开营 · 周日晚上八点收队（北京时间）</div>
  </div>
</div>
`;

  const template = document.createElement('template');
  template.innerHTML = TEMPLATE_HTML.trim();

  placeholders.forEach((placeholder) => {
    const clone = template.content.firstElementChild.cloneNode(true);
    const extraClass = placeholder.getAttribute('data-countdown-class');
    if (extraClass) {
      extraClass.split(/\s+/).filter(Boolean).forEach((cls) => clone.classList.add(cls));
    }
    placeholder.replaceWith(clone);
  });
})();
