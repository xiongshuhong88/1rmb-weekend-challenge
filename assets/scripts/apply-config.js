// Apply event config to DOM using data-config-* attributes.
(function () {
  const config = window.__EVENT_CONFIG__ || {};

  function getValue(path) {
    if (!path) return undefined;
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), config);
  }

  function applyText(node) {
    const path = node.getAttribute('data-config-text');
    const template = node.getAttribute('data-config-template');
    const value = getValue(path);
    if (value === undefined) return;
    if (template) {
      node.textContent = template.replace(/\{\{\s*value\s*\}\}/g, String(value));
    } else {
      node.textContent = String(value);
    }
  }

  function applyAttr(node, attr, dataAttr) {
    const path = node.getAttribute(dataAttr);
    const value = getValue(path);
    if (value === undefined) return;
    node.setAttribute(attr, String(value));
  }

  document.querySelectorAll('[data-config-text]').forEach(applyText);
  document.querySelectorAll('[data-config-html]').forEach(node => {
    const path = node.getAttribute('data-config-html');
    const value = getValue(path);
    if (value !== undefined) node.innerHTML = String(value);
  });
  document.querySelectorAll('[data-config-href]').forEach(node => applyAttr(node, 'href', 'data-config-href'));
  document.querySelectorAll('[data-config-src]').forEach(node => applyAttr(node, 'src', 'data-config-src'));
  document.querySelectorAll('[data-config-content]').forEach(node => applyAttr(node, 'content', 'data-config-content'));
})();
