// Optional maintenance utility, not required to build or deploy the website.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const lucide = require(path.join(root, 'vendor/lucide.min.js'));
const names = ['activity','waves','droplets','thermometer','gauge','cloud-sun','rotate-cw','sun-medium','flask-conical','fan','shield-check','heart','message-circle','share-2','link','x','camera','file-check-2','chart-line','send','scan-line','bell','sparkles','scan-search','sprout','leaf','sliders-horizontal','arrow-up-right','arrow-right','qr-code','cpu','smartphone','book-open'];
const icons = {};
names.forEach(name => {
  const key = name.replace(/(^|-)([a-z0-9])/g, (_, dash, letter) => letter.toUpperCase());
  if (!lucide[key]) throw new Error(key);
  icons[name] = lucide[key];
});
fs.writeFileSync(path.join(root, 'js/icons.js'), `/* Lucide v1.17.0, ISC. Subset of the original bundle. See vendor/LICENSE. */
(function () {
const icons = ${JSON.stringify(icons)};
window.lucide = { createIcons: function () {
  document.querySelectorAll('[data-lucide]').forEach(function (node) {
    const name = node.getAttribute('data-lucide');
    if (!icons[name]) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' };
    Object.keys(attrs).forEach(function (key) { svg.setAttribute(key, attrs[key]); });
    icons[name].forEach(function (part) {
      const child = document.createElementNS('http://www.w3.org/2000/svg', part[0]);
      Object.keys(part[1]).forEach(function (key) { child.setAttribute(key, part[1][key]); });
      svg.appendChild(child);
    });
    node.parentNode.replaceChild(svg, node);
  });
} };
}());\n`);
console.log('Icon subset:', fs.statSync(path.join(root, 'js/icons.js')).size, 'bytes');
