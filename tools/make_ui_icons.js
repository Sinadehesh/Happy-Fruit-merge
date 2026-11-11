// Renders the candy-style icons of the Lucky Wheel, the Daily Gift and the Undo booster from SVG to transparent
// PNGs (200 x 200):   node tools/make_ui_icons.js assets/ui
const { chromium } = require('playwright');
const OUT = process.argv[2];
const LINE = '#7a3410';
const slices = ['#ff5c8a', '#ffb02e', '#5fd37a', '#35c3f0', '#9b6bff', '#ffd23f', '#ff7a45', '#4d8dff'];
function wedge(i) {
  const a0 = (i * 45 - 90) * Math.PI / 180, a1 = ((i + 1) * 45 - 90) * Math.PI / 180, r = 84;
  const p = a => `${(100 + r * Math.cos(a)).toFixed(2)},${(104 + r * Math.sin(a)).toFixed(2)}`;
  return `<path d="M100,104 L${p(a0)} A${r},${r} 0 0 1 ${p(a1)} Z" fill="${slices[i]}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>`;
}
const bulbs = [...Array(8)].map((_, i) => { const a = (i * 45 - 67.5) * Math.PI / 180; return `<circle cx="${(100 + 86 * Math.cos(a)).toFixed(1)}" cy="${(104 + 86 * Math.sin(a)).toFixed(1)}" r="5" fill="#fff6c9" stroke="${LINE}" stroke-width="2"/>`; }).join('');
const ICONS = {
  icon_wheel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs><linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe07a"/><stop offset="1" stop-color="#f29a1c"/></linearGradient>
    <radialGradient id="hub" cx="0.4" cy="0.35"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#f7a928"/></radialGradient></defs>
    <circle cx="100" cy="104" r="92" fill="url(#rim)" stroke="${LINE}" stroke-width="7"/>
    ${[...Array(8)].map((_, i) => wedge(i)).join('')}
    <path d="M100,104 m-84,0 a84,84 0 0 1 168,0" fill="#fff" opacity="0.16"/>
    ${bulbs}
    <circle cx="100" cy="104" r="20" fill="url(#hub)" stroke="${LINE}" stroke-width="5"/>
    <ellipse cx="94" cy="97" rx="7" ry="4" fill="#fff" opacity="0.8" transform="rotate(-30 94 97)"/>
    <path d="M100,40 L82,6 Q100,-2 118,6 Z" fill="#ff4d6d" stroke="${LINE}" stroke-width="6" stroke-linejoin="round"/>
    <ellipse cx="94" cy="12" rx="6" ry="3" fill="#fff" opacity="0.7"/>
  </svg>`,
  icon_gift: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs><linearGradient id="box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7fb0"/><stop offset="1" stop-color="#e83e7c"/></linearGradient>
    <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9cc4"/><stop offset="1" stop-color="#f25590"/></linearGradient>
    <linearGradient id="rib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#f7b021"/></linearGradient></defs>
    <rect x="30" y="92" width="140" height="96" rx="14" fill="url(#box)" stroke="${LINE}" stroke-width="7"/>
    <rect x="84" y="92" width="32" height="96" fill="url(#rib)" stroke="${LINE}" stroke-width="5"/>
    <rect x="18" y="64" width="164" height="42" rx="13" fill="url(#lid)" stroke="${LINE}" stroke-width="7"/>
    <rect x="82" y="64" width="36" height="42" fill="url(#rib)" stroke="${LINE}" stroke-width="5"/>
    <path d="M100,64 C70,66 40,52 44,30 C48,10 82,22 100,60 Z" fill="url(#rib)" stroke="${LINE}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M100,64 C130,66 160,52 156,30 C152,10 118,22 100,60 Z" fill="url(#rib)" stroke="${LINE}" stroke-width="7" stroke-linejoin="round"/>
    <circle cx="100" cy="60" r="13" fill="#ffd23f" stroke="${LINE}" stroke-width="6"/>
    <rect x="30" y="72" width="40" height="9" rx="4.5" fill="#fff" opacity="0.55"/>
    <rect x="42" y="112" width="9" height="46" rx="4.5" fill="#fff" opacity="0.35"/>
    <ellipse cx="62" cy="30" rx="8" ry="4" fill="#fff" opacity="0.7" transform="rotate(-25 62 30)"/>
  </svg>`,
  icon_undo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs><radialGradient id="b" cx="0.4" cy="0.3"><stop offset="0" stop-color="#7fd4ff"/><stop offset="1" stop-color="#2d7fe0"/></radialGradient></defs>
    <circle cx="100" cy="100" r="88" fill="url(#b)" stroke="#1c3f7a" stroke-width="8"/>
    <ellipse cx="72" cy="52" rx="34" ry="17" fill="#fff" opacity="0.4" transform="rotate(-25 72 52)"/>
    <path d="M70,72 A46,46 0 1 1 78,146" fill="none" stroke="#1c3f7a" stroke-width="34" stroke-linecap="round"/>
    <path d="M94,38 L42,72 L94,108 Z" fill="#1c3f7a" stroke="#1c3f7a" stroke-width="14" stroke-linejoin="round"/>
    <path d="M70,72 A46,46 0 1 1 78,146" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round"/>
    <path d="M94,38 L42,72 L94,108 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
  </svg>`,
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 200, height: 200 }, deviceScaleFactor: 1 });
  for (const [name, svg] of Object.entries(ICONS)) {
    await p.setContent(`<body style="margin:0;background:transparent">${svg.replace('<svg ', '<svg width="200" height="200" ')}</body>`);
    await p.screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
  }
  await b.close();
})();
