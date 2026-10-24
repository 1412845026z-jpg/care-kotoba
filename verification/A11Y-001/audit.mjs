// Accessibility spot check of the main screens at 390px (offline harness + mock AI).
// Text contrast (WCAG 2.1 1.4.3), accessible names of buttons/inputs (4.1.2), target size
// (2.5.8 AA: 24x24 CSS px; 44x44 reported as advisory). Not a full audit, no screen reader.
// Run from prototype/: CK_TOOL_NODE_MODULES=<dir> node ../verification/A11Y-001/audit.mjs out.json
import { writeFileSync } from 'node:fs';
import { setup, gotoApp, openScene, PHONE } from '../../prototype/tests/e2e/helpers.mjs';

const env = await setup();
const VIEW = process.env.CK_AUDIT_VIEWPORT ? process.env.CK_AUDIT_VIEWPORT.split('x').map(Number) : null;
const report = { ranAt: new Date().toISOString(), viewport: VIEW ? VIEW.join('x') : '390x844', screens: {} };

async function audit(page, name) {
  // Let entrance transitions finish (a fading sheet would otherwise be measured half transparent); infinite loops are skipped.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming?.().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  report.screens[name] = await page.evaluate(() => {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(',').map(Number); return { r, g, b, a }; };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; const img = getComputedStyle(e).backgroundImage; if (img !== 'none') { if (/url\(/.test(img)) return null; const stops = [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((c) => c && c.a > 0.5); if (!stops.length) return null; return { stops }; } } return { r: 255, g: 255, b: 255, a: 1 }; };
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.1; };
    const contrast = [];
    const tiny = []; // DEAI-001: text under 12px (furigana <rt> excluded; it is sized relative to its base)
    const seen = new Set();
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el) || ['SCRIPT', 'STYLE', 'svg', 'path'].includes(el.tagName)) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
      if (!own) continue;
      const s = getComputedStyle(el);
      if (parseFloat(s.fontSize) < 12 && !['RT', 'RP'].includes(el.tagName) && tiny.length < 20) tiny.push({ text: own.slice(0, 30), cls: String(el.className).slice(0, 50), size: s.fontSize });
      const fg = parse(s.color), bg = bgOf(el);
      if (!fg || !bg) continue;
      // A11Y-003: include the opacity of the element and its ancestors (e.g. furigana at .85), as axe does.
      let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
      const a = fg.a * op;
      const ratioOn = (b) => { const mix = { r: fg.r * a + b.r * (1 - a), g: fg.g * a + b.g * (1 - a), b: fg.b * a + b.b * (1 - a) }; const L1 = lum(mix), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
      const ratio = bg.stops ? Math.min(...bg.stops.map(ratioOn)) : ratioOn(bg);
      const size = parseFloat(s.fontSize), bold = Number(s.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5;
      if (ratio < need) {
        const key = el.className + '|' + s.color + '|' + s.fontSize;
        if (seen.has(key)) continue; seen.add(key);
        const path = []; for (let e = el; e && path.length < 3; e = e.parentElement) { const c = typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : e.tagName.toLowerCase(); path.unshift(c); }
        contrast.push({ text: own.slice(0, 40), cls: String(el.className).slice(0, 60), path: path.join(' > '), color: s.color, bg: bg.stops ? 'gradient ' + bg.stops.map((c) => `rgb(${c.r}, ${c.g}, ${c.b})`).join(' / ') : `rgb(${bg.r}, ${bg.g}, ${bg.b})`, size: s.fontSize, ratio: Math.round(ratio * 100) / 100, need });
      }
    }
    const names = [], small = [], advisory = [];
    for (const el of document.querySelectorAll('button, a[href], input, textarea, select, [role=button]')) {
      if (!visible(el)) continue;
      const label = el.getAttribute('aria-label') || el.textContent.trim() || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent.trim()) || el.closest('label')?.textContent.trim() || el.getAttribute('title') || el.getAttribute('placeholder');
      const desc = (el.className || el.tagName).toString().slice(0, 50);
      if (!label) names.push(desc);
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) small.push({ el: desc, label: (label || '').slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
      else if (r.width < 44 || r.height < 44) advisory.push({ el: desc, label: (label || '').slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
    }
    const zoomInputs = [...document.querySelectorAll('input, select, textarea')].filter(visible).filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => (e.getAttribute('aria-label') || e.name || e.className || e.tagName).toString().slice(0, 40));
    return { contrast, textUnder12px: tiny, unnamedControls: names, inputsUnder16px: zoomInputs, targetsUnder24: small, targetsUnder44: advisory.length, targetsUnder44Examples: advisory.slice(0, 8), scrollWidth: document.documentElement.scrollWidth };
  });
}

// Tabs: bottom nav on phones, sidebar on desktop.
const DESK = { 'シーン': 'シーンを探す', 'ノート': 'ことばノート', '学習記録': '学習の記録', '基礎': '基礎の声かけ' };
async function nav(page, label) {
  const mobile = page.locator('.mobile-nav button', { hasText: label });
  if (await mobile.isVisible()) return mobile.click();
  return page.locator('.sidebar nav button', { hasText: DESK[label] || label }).click();
}

try {
  const ctx = VIEW ? { viewport: { width: VIEW[0], height: VIEW[1] }, locale: 'ja-JP' } : PHONE;
  const page = await env.page(ctx);
  await gotoApp(page, env.baseUrl);
  await audit(page, 'home');
  await nav(page, 'シーン');
  await audit(page, 'scenes');
  await openScene(page, env.baseUrl, '入浴を断られたとき');
  await audit(page, 'scene-modal');
  await page.getByRole('button', { name: '文字で練習' }).click();
  await page.getByLabel('日本語で返答を入力').fill('今日は入りたくないのですね。');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length >= 2);
  await audit(page, 'practice-text');
  await page.getByText('終了して振り返る').click();
  await page.locator('.feedback-summary h2').waitFor();
  await audit(page, 'feedback');
  const p2 = await env.page(ctx);
  await p2.addInitScript(() => localStorage.setItem('ck-notes', JSON.stringify([{ id: 'n1', text: '今は入りたくないのですね。', sceneId: 'bath-5', original: '入りませんか。', reason: '気持ちを受け止める' }])));
  await gotoApp(p2, env.baseUrl);
  await nav(p2, 'ノート');
  await audit(p2, 'notes');
  // REVIEW-001: the review session with the answer shown.
  await p2.getByRole('button', { name: /復習をはじめる/ }).click();
  await p2.getByRole('button', { name: '答えを見る' }).click();
  await p2.locator('.review-answers').waitFor();
  await audit(p2, 'review');
  await nav(p2, '学習記録');
  await audit(p2, 'progress');
  // DEAI-001: settings sheet, and the sample organisation screen where the sidebar exists (desktop).
  await p2.locator('.topbar .lang-button').click();
  await p2.locator('.settings-modal').waitFor();
  await audit(p2, 'settings');
  await p2.keyboard.press('Escape');
  await p2.locator('.settings-modal').waitFor({ state: 'detached' }).catch(() => {});
  if (await p2.locator('.sidebar').isVisible()) {
    await p2.locator('.sidebar button', { hasText: '法人向け管理' }).click();
    await p2.locator('.admin-main').waitFor();
    await audit(p2, 'admin');
  }
  // SSW-BASIC-APP-001: the basic course list and a practice sheet with the answer shown.
  const p4 = await env.page(ctx);
  await gotoApp(p4, env.baseUrl);
  await nav(p4, '基礎');
  await p4.locator('.basic-topic').first().waitFor();
  await audit(p4, 'basic');
  await p4.locator('.basic-topic').first().click();
  await p4.locator('.basic-scene-row').nth(1).click();
  await p4.getByRole('button', { name: '答えを見る' }).click();
  await p4.locator('.basic-answer').waitFor();
  await audit(p4, 'basic-practice');
  // LEGAL-UI-001: the about page with one notice opened.
  await p4.keyboard.press('Escape');
  await p4.locator('.basic-modal').waitFor({ state: 'detached' }).catch(() => {});
  await p4.locator('.footer-about').click();
  await p4.locator('.about-notices summary').first().click();
  await audit(p4, 'about');
  // CORE-PREVIEW-001: the optional core drafts (hidden by default; turned on via prefs here).
  const p3 = await env.page(ctx);
  await p3.addInitScript(() => localStorage.setItem('ck-prefs', JSON.stringify({ locale: 'zh', level: 'gentle', goal: 5, plan: 'personal', furigana: true, corePreview: true })));
  await gotoApp(p3, env.baseUrl);
  await p3.locator('.core-entry').scrollIntoViewIfNeeded();
  await audit(p3, 'home-core');
  await nav(p3, 'シーン');
  await p3.locator('.core-pill').click();
  await p3.locator('.core-notice').waitFor();
  await p3.waitForTimeout(600); // let the pill colour transition finish before measuring
  await audit(p3, 'scenes-core');
  await p3.locator('.scene-grid .scene-card').first().click();
  await p3.locator('.scene-modal .core-modal-note').waitFor();
  await audit(p3, 'core-modal');
} finally {
  await env.close();
}
const summary = Object.fromEntries(Object.entries(report.screens).map(([k, v]) => [k, { contrast: v.contrast.filter((c) => c.text !== '✦').length, decorativeSpark: v.contrast.filter((c) => c.text === '✦').length, unnamed: v.unnamedControls.length, inputsUnder16px: v.inputsUnder16px.length, under24: v.targetsUnder24.length, textUnder12: v.textUnder12px.length, under44: v.targetsUnder44, scrollWidth: v.scrollWidth }]));
report.summary = summary;
writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(summary));
