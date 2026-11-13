/* Тиын — учёт расходов. Все данные — один JSON-объект в localStorage (ключ tiyn-data-v1). */
(() => {
'use strict';

/* ================= helpers ================= */

const KEY = 'tiyn-data-v1';
const THEME_KEY = 'tiyn-theme';
const WALLETS = [{ id: 'kaspi', name: 'Kaspi' }, { id: 'cash', name: 'Наличные' }];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const CAT_ICONS = ['food', 'coffee', 'cart', 'bed', 'monitor', 'phone', 'bus', 'gamepad', 'shirt', 'cross', 'book', 'gift', 'wrench', 'music', 'heart', 'dots'];
const COLORS = 10;
const NOTE_MAX = 300;
/* Страница для просмотра внутри Claude (claude-preview.html): там нет файлов, установки и истории браузера. */
const PREVIEW = window.TIYN_PREVIEW === true;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const nf2 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = n => { n = Math.abs(r2(n)); return (Number.isInteger(n) ? nf : nf2).format(n); };
const toInput = n => String(r2(n)).replace('.', ',');

function money(n, sign) {
  n = r2(n);
  const s = sign === 'always' ? (n > 0 ? '+' : n < 0 ? '−' : '') : (n < 0 ? '−' : '');
  return `<span class="m">${s}${num(n)}<span class="cur">&nbsp;₸</span></span>`;
}
const moneyText = n => (r2(n) < 0 ? '−' : '') + num(n) + ' ₸';

const parseSigned = s => {
  const v = parseFloat(String(s ?? '').replace(/[\s  ]/g, '').replace(',', '.').replace(/^[−–—]/, '-'));
  return Number.isFinite(v) ? r2(v) : 0;
};
const parseAmt = s => Math.max(0, parseSigned(s));

const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ym = s => String(s).slice(0, 7);
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const thisMonth = () => ym(ymd());

function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
function dayLabel(s) {
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (s === ymd()) return 'Сегодня';
  if (s === ymd(y)) return 'Вчера';
  const d = parseYmd(s);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${d.getFullYear() === new Date().getFullYear() ? '' : ' ' + d.getFullYear()}, ${WEEKDAYS[d.getDay()]}`;
}
function monthLabel(k) {
  const [y, m] = k.split('-').map(Number);
  return MONTHS[m - 1] + (y === new Date().getFullYear() ? '' : ' ' + y);
}
function shiftMonth(k, by) {
  const [y, m] = k.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function ago(ts) {
  const a = new Date(ts); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  const days = Math.round((b - a) / 864e5);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
}
function hue(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}

/* ================= icons ================= */

const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  chevl: '<path d="m15 18-6-6 6-6"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  in: '<path d="M17 7 7 17M17 17H7V7"/>',
  swap: '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><path d="M7.5 7.5h.01"/>',
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
  coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v2M10 2v2M14 2v2"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  bus: '<rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 17v3M16 17v3M8 14h.01M16 14h.01"/>',
  gamepad: '<rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/>',
  shirt: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  text: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
};
const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || I.dots}</svg>`;

/* ================= data ================= */

function blank() {
  return {
    app: 'tiyn',
    version: 1,
    createdAt: new Date().toISOString(),
    wallets: WALLETS.map(w => ({ ...w })),
    categories: [
      { id: 'food', name: 'Еда', icon: 'food', color: 1 },
      { id: 'dorm', name: 'Общага', icon: 'bed', color: 2 },
      { id: 'pc', name: 'Комп', icon: 'monitor', color: 3 },
      { id: 'transport', name: 'Транспорт', icon: 'bus', color: 9 },
      { id: 'fun', name: 'Развлечения', icon: 'gamepad', color: 4 },
      { id: 'clothes', name: 'Одежда', icon: 'shirt', color: 5 },
      { id: 'health', name: 'Здоровье', icon: 'cross', color: 6 },
      { id: 'study', name: 'Учёба', icon: 'book', color: 7 },
      { id: 'phone', name: 'Связь', icon: 'phone', color: 8 },
      { id: 'other', name: 'Прочее', icon: 'dots', color: 10 },
    ],
    people: [],
    tx: [],
    checks: [],
    settings: { theme: 'auto', lastExport: null },
  };
}

/* Приводит загруженный JSON к ожидаемой форме; бросает ошибку, если это не данные приложения. */
function normalize(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.tx)) throw new Error('not tiyn data');
  const b = blank();
  const out = { ...b, ...d };
  out.wallets = WALLETS.map(w => ({ ...w }));
  out.categories = Array.isArray(d.categories) && d.categories.length
    ? d.categories.filter(c => c && c.id != null).map(c => ({
        id: String(c.id),
        name: String(c.name || 'Без названия').slice(0, 30),
        icon: I[c.icon] ? c.icon : 'dots',
        color: Math.min(COLORS, Math.max(1, parseInt(c.color, 10) || 1)),
      }))
    : b.categories;
  if (!out.categories.some(c => c.id === 'other')) out.categories.push({ id: 'other', name: 'Прочее', icon: 'dots', color: 10 });
  out.people = Array.isArray(d.people) ? d.people.filter(p => p && p.id != null).map(p => ({ id: String(p.id), name: String(p.name || '?').slice(0, 30) })) : [];
  out.checks = Array.isArray(d.checks) ? d.checks.filter(c => c && c.wallet) : [];
  out.settings = { ...b.settings, ...(d.settings && typeof d.settings === 'object' ? d.settings : {}) };
  out.tx = d.tx.filter(t => t && t.id != null && t.type && /^\d{4}-\d{2}-\d{2}$/.test(t.date || '')).map(t => {
    const o = { ...t, id: String(t.id), ts: Number(t.ts) || 0, note: String(t.note || '') };
    if (o.type === 'adjust') o.delta = r2(o.delta); else o.amount = Math.abs(r2(o.amount));
    if (Array.isArray(o.shares)) o.shares = o.shares.filter(s => s && s.person != null).map(s => ({ person: String(s.person), amount: Math.abs(r2(s.amount)) }));
    return o;
  });
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { console.error('Не удалось прочитать данные', e); }
  return null;
}

let S = load();
let cache = null;

function save() {
  cache = null;
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Не удалось сохранить: память браузера недоступна'); }
}

const cat = id => S.categories.find(c => c.id === id) || S.categories.find(c => c.id === 'other') || { id: 'other', name: 'Прочее', icon: 'dots', color: 10 };
const walletName = id => (WALLETS.find(w => w.id === id) || { name: 'Кошелёк' }).name;
const personName = id => (S.people.find(p => p.id === id) || { name: 'Кто-то' }).name;

/* Что запись делает с кошельками (w) и с долгами людей (p: плюс — должны мне, минус — должен я). */
function txEffect(t) {
  const w = {}, p = {};
  const add = (o, k, v) => { if (k != null) o[k] = r2((o[k] || 0) + v); };
  if (t.type === 'expense') {
    if (t.paidBy) add(p, t.paidBy, -t.amount);
    else { add(w, t.wallet, -t.amount); for (const s of t.shares || []) add(p, s.person, s.amount); }
  } else if (t.type === 'income') add(w, t.wallet, t.amount);
  else if (t.type === 'transfer') { add(w, t.from, -t.amount); add(w, t.to, t.amount); }
  else if (t.type === 'debt') {
    const out = t.dir === 'lend' || t.dir === 'repay';
    add(w, t.wallet, out ? -t.amount : t.amount);
    add(p, t.person, out ? t.amount : -t.amount);
  } else if (t.type === 'adjust') add(w, t.wallet, t.delta);
  return { w, p };
}

/* Моя часть расхода: вся сумма минус то, что вернут другие. */
const myShare = t => t.type !== 'expense' ? 0 : r2(t.amount - (t.paidBy ? 0 : (t.shares || []).reduce((a, s) => a + s.amount, 0)));

function totals() {
  if (cache) return cache;
  const bal = { kaspi: 0, cash: 0 }, debt = {};
  for (const t of S.tx) {
    const e = txEffect(t);
    for (const k in e.w) bal[k] = r2((bal[k] || 0) + e.w[k]);
    for (const k in e.p) debt[k] = r2((debt[k] || 0) + e.p[k]);
  }
  let owed = 0, owe = 0, owedN = 0, oweN = 0;
  for (const p of S.people) {
    const v = debt[p.id] || 0;
    if (v > 0) { owed += v; owedN++; } else if (v < 0) { owe -= v; oweN++; }
  }
  return (cache = { bal, debt, owed: r2(owed), owe: r2(owe), owedN, oweN });
}

const sortedTx = () => [...S.tx].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts));

function monthStats(k) {
  const by = {};
  let spent = 0, income = 0;
  for (const t of S.tx) {
    if (ym(t.date) !== k) continue;
    if (t.type === 'expense') { const v = myShare(t); by[t.category] = r2((by[t.category] || 0) + v); spent += v; }
    else if (t.type === 'income') income += t.amount;
  }
  return { by, spent: r2(spent), income: r2(income) };
}

function personStats(id) {
  const st = { spent: 0, got: 0, took: 0, gave: 0 };
  for (const t of S.tx) {
    if (t.type === 'expense') {
      if (t.paidBy === id) st.took += t.amount;
      else if (!t.paidBy) for (const s of t.shares || []) if (s.person === id) st.spent += s.amount;
    } else if (t.type === 'debt' && t.person === id) {
      if (t.dir === 'lend') st.spent += t.amount;
      else if (t.dir === 'returned') st.got += t.amount;
      else if (t.dir === 'borrow') st.took += t.amount;
      else if (t.dir === 'repay') st.gave += t.amount;
    }
  }
  for (const k in st) st[k] = r2(st[k]);
  return st;
}
const involves = (t, id) => t.person === id || t.paidBy === id || (!t.paidBy && (t.shares || []).some(s => s.person === id));

/* Сколько денег ушло из кошелька по записям, сделанным после момента ts (исправления баланса не считаем). */
function outSince(wallet, ts) {
  let s = 0;
  for (const t of S.tx) {
    if (t.ts <= ts || t.type === 'adjust') continue;
    const d = txEffect(t).w[wallet] || 0;
    if (d < 0) s -= d;
  }
  return r2(s);
}
function lastCheck(wallet) {
  for (let i = S.checks.length - 1; i >= 0; i--) if (S.checks[i].wallet === wallet) return S.checks[i];
  return null;
}

/* ================= views ================= */

const ui = { tab: 'home', month: thisMonth(), filter: 'all', fcat: '' };

function txView(t) {
  if (t.type === 'expense') {
    const c = cat(t.category), sh = t.paidBy ? [] : (t.shares || []);
    const sub = [];
    if (t.note) sub.push(c.name);
    sub.push(t.paidBy ? `заплатил(а) ${personName(t.paidBy)}, я должен` : walletName(t.wallet));
    if (sh.length) sub.push(`делили с: ${sh.map(s => personName(s.person)).join(', ')}`);
    return { icon: c.icon, tile: 'c' + c.color, title: t.note || c.name, sub: sub.join(' · '), amount: -t.amount, tone: '', extra: sh.length ? `моя доля ${moneyText(myShare(t))}` : '' };
  }
  if (t.type === 'income') return { icon: 'in', tile: 't-pos', title: t.note || 'Приход', sub: walletName(t.wallet), amount: t.amount, tone: 'pos' };
  if (t.type === 'transfer') return { icon: 'swap', tile: 't-mute', title: `${walletName(t.from)} → ${walletName(t.to)}`, sub: t.note || 'Перевод между кошельками', amount: t.amount, tone: 'mute', plain: true };
  if (t.type === 'debt') {
    const map = { lend: ['Дал в долг', -1], returned: ['Мне вернули', 1], borrow: ['Взял в долг', 1], repay: ['Я вернул долг', -1] };
    const [label, sgn] = map[t.dir] || ['Долг', 1];
    return { icon: 'people', tile: 't-accent', title: `${label} · ${personName(t.person)}`, sub: [walletName(t.wallet), t.note].filter(Boolean).join(' · '), amount: sgn * t.amount, tone: sgn > 0 ? 'pos' : '' };
  }
  return { icon: 'scale', tile: 't-mute', title: t.note || 'Исправление баланса', sub: walletName(t.wallet), amount: t.delta, tone: t.delta > 0 ? 'pos' : '' };
}

function txRow(t) {
  const v = txView(t);
  return `<li><button class="tx" data-act="tx" data-id="${esc(t.id)}">
    <span class="tile ${v.tile}">${icon(v.icon)}</span>
    <span class="tx-main"><span class="tx-title">${esc(v.title)}</span>${v.sub ? `<span class="tx-sub">${esc(v.sub)}</span>` : ''}</span>
    <span class="tx-amt ${v.tone}">${v.plain ? money(v.amount) : money(v.amount, 'always')}${v.extra ? `<span class="tx-extra">${esc(v.extra)}</span>` : ''}</span>
  </button></li>`;
}

function monthNav() {
  return `<div class="mnav">
    <button class="icon-btn" data-act="month" data-by="-1" aria-label="Предыдущий месяц">${icon('chevl')}</button>
    <button class="icon-btn" data-act="month" data-by="1" aria-label="Следующий месяц" ${ui.month >= thisMonth() ? 'disabled' : ''}>${icon('chev')}</button>
  </div>`;
}

function homeHtml() {
  const T = totals();
  const total = r2(T.bal.kaspi + T.bal.cash);
  const st = monthStats(ui.month);
  const cats = S.categories.map(c => ({ c, v: st.by[c.id] || 0 })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const max = cats.length ? cats[0].v : 0;
  const recent = sortedTx().slice(0, 6);
  const lc = lastCheck('kaspi');
  const who = n => `${n} ${plural(n, 'человек', 'человека', 'человек')}`;
  return `
  <section class="hero" aria-label="Баланс">
    <div class="hero-sun" aria-hidden="true"></div>
    <p class="hero-label">Всего денег</p>
    <p class="hero-total ${num(total).length > 8 ? 'long' : ''}">${money(total)}</p>
    <div class="wallets">
      ${WALLETS.map(w => `<button class="wallet" data-act="check" data-wallet="${w.id}" aria-label="${w.name}: сверить остаток">
        <span class="w-name"><i class="dot ${w.id}"></i>${w.name}</span><span class="w-sum">${money(T.bal[w.id])}</span></button>`).join('')}
    </div>
  </section>

  <div class="duo">
    <button class="stat" data-act="tab" data-tab="debts"><span class="stat-label">Мне должны</span><span class="stat-val ${T.owed ? 'pos' : ''}">${money(T.owed)}</span><span class="stat-sub">${T.owedN ? who(T.owedN) : 'никто'}</span></button>
    <button class="stat" data-act="tab" data-tab="debts"><span class="stat-label">Я должен</span><span class="stat-val ${T.owe ? 'neg' : ''}">${money(T.owe)}</span><span class="stat-sub">${T.oweN ? who(T.oweN) : 'никому'}</span></button>
  </div>

  <div class="card"><button class="tx" data-act="check" data-wallet="kaspi">
    <span class="tile t-kaspi">${icon('scale')}</span>
    <span class="tx-main"><span class="tx-title">Сверка с Kaspi</span><span class="tx-sub">${lc
      ? `Последняя ${ago(lc.ts)} · ${lc.diff ? 'расхождение было ' + moneyText(Math.abs(lc.diff)) : 'всё сошлось'}`
      : 'Введи остаток из Kaspi — покажу, сколько трат не записано'}</span></span>
    ${icon('chev', 'chev')}
  </button></div>

  <section class="block">
    <header class="sec-head"><h2>${monthLabel(ui.month)}</h2>${monthNav()}</header>
    <div class="card">
      <div class="spent"><span class="spent-label">Потрачено</span><span class="spent-val">${money(st.spent)}</span>${st.income ? `<span class="spent-in">пришло ${money(st.income)}</span>` : ''}</div>
      ${cats.length ? `<ul class="cats">${cats.map(({ c, v }) => `<li><button class="cat-row c${c.color}" data-act="fcat" data-v="${esc(c.id)}" data-go="1">
        <span class="tile">${icon(c.icon)}</span>
        <span class="cat-body"><span class="cat-top"><span class="cat-name">${esc(c.name)}</span><span class="cat-val">${money(v)}<span class="cat-pct">${Math.round(v / st.spent * 100)}%</span></span></span>
        <span class="bar"><i style="width:${Math.max(3, v / max * 100).toFixed(1)}%"></i></span></span>
      </button></li>`).join('')}</ul>` : `<p class="empty">В этом месяце расходов пока нет.</p>`}
    </div>
  </section>

  <section class="block">
    <header class="sec-head"><h2>Последние записи</h2>${recent.length ? `<button class="link" data-act="tab" data-tab="history">Все</button>` : ''}</header>
    <div class="card">${recent.length ? `<ul class="txs">${recent.map(txRow).join('')}</ul>` : `<p class="empty">Нажми жёлтую кнопку «+» внизу, чтобы записать первую трату.</p>`}</div>
  </section>`;
}

function historyHtml() {
  const k = ui.month, f = ui.filter, st = monthStats(k);
  let list = sortedTx().filter(t => ym(t.date) === k);
  if (f === 'expense') list = list.filter(t => t.type === 'expense' && (!ui.fcat || t.category === ui.fcat));
  else if (f === 'income') list = list.filter(t => t.type === 'income');
  else if (f === 'debt') list = list.filter(t => t.type === 'debt' || (t.type === 'expense' && (t.paidBy || (t.shares || []).length)));
  const days = [];
  for (const t of list) {
    let d = days[days.length - 1];
    if (!d || d.date !== t.date) { d = { date: t.date, items: [], spent: 0 }; days.push(d); }
    d.items.push(t);
    d.spent = r2(d.spent + myShare(t));
  }
  const chips = [['all', 'Все'], ['expense', 'Расходы'], ['income', 'Приходы'], ['debt', 'Долги']];
  return `
  <header class="sec-head big"><h2>${monthLabel(k)}</h2><div class="mnav"><button class="icon-btn" data-act="report" data-month="${k}" aria-label="Отчёт за месяц текстом">${icon('text')}</button>${monthNav()}</div></header>
  <div class="duo">
    <div class="stat"><span class="stat-label">Потрачено</span><span class="stat-val">${money(st.spent)}</span></div>
    <div class="stat"><span class="stat-label">Пришло</span><span class="stat-val ${st.income ? 'pos' : ''}">${money(st.income)}</span></div>
  </div>
  <div class="chips scroll" role="group" aria-label="Фильтр">${chips.map(([v, l]) => `<button class="chip ${f === v ? 'on' : ''}" data-act="filter" data-v="${v}" aria-pressed="${f === v}">${l}</button>`).join('')}</div>
  ${f === 'expense' ? `<div class="chips scroll" role="group" aria-label="Категория">
    <button class="chip ${ui.fcat ? '' : 'on'}" data-act="fcat" data-v="">Все категории</button>
    ${S.categories.map(c => `<button class="chip cat c${c.color} ${ui.fcat === c.id ? 'on' : ''}" data-act="fcat" data-v="${esc(c.id)}">${icon(c.icon)}${esc(c.name)}</button>`).join('')}
  </div>` : ''}
  ${days.length ? days.map(d => `<section class="block">
    <div class="day"><span>${dayLabel(d.date)}</span>${d.spent ? `<span>потрачено ${moneyText(d.spent)}</span>` : ''}</div>
    <div class="card"><ul class="txs">${d.items.map(txRow).join('')}</ul></div>
  </section>`).join('') : `<div class="card"><p class="empty">${S.tx.length ? 'За этот месяц таких записей нет.' : 'Записей пока нет. Нажми «+», чтобы добавить первую.'}</p></div>`}`;
}

function debtsHtml() {
  const T = totals();
  const ppl = S.people.map(p => ({ p, v: T.debt[p.id] || 0, st: personStats(p.id) }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v) || a.p.name.localeCompare(b.p.name, 'ru'));
  return `
  <header class="sec-head big"><h2>Долги</h2><button class="icon-btn" data-act="add-person" aria-label="Добавить человека">${icon('userplus')}</button></header>
  <div class="duo">
    <div class="stat"><span class="stat-label">Мне должны</span><span class="stat-val ${T.owed ? 'pos' : ''}">${money(T.owed)}</span></div>
    <div class="stat"><span class="stat-label">Я должен</span><span class="stat-val ${T.owe ? 'neg' : ''}">${money(T.owe)}</span></div>
  </div>
  <button class="btn ghost wide" data-act="add-debt">${icon('plus')} Записать долг или возврат</button>
  <div class="card">${ppl.length ? `<ul class="txs">${ppl.map(({ p, v, st }) => `<li><button class="tx" data-act="person" data-id="${esc(p.id)}">
    <span class="avatar" style="--h:${hue(p.name)}">${esc([...p.name][0].toUpperCase())}</span>
    <span class="tx-main"><span class="tx-title">${esc(p.name)}</span><span class="tx-sub">${v > 0 ? 'должен(на) мне' : v < 0 ? 'я должен' : 'в расчёте'}${st.spent ? ` · я потратил ${moneyText(st.spent)}` : ''}</span></span>
    <span class="tx-amt ${v > 0 ? 'pos' : v < 0 ? 'neg' : 'mute'}">${v ? money(Math.abs(v)) : icon('check')}</span>
  </button></li>`).join('')}</ul>` : `<p class="empty">Здесь появятся люди, с которыми делишь покупки. Отметь «Общая покупка», когда записываешь расход, или добавь человека кнопкой сверху.</p>`}</div>`;
}

function moreHtml() {
  const T = totals();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const le = S.settings.lastExport, n = S.tx.length, theme = S.settings.theme || 'auto';
  const row = (act, ic, tile, title, sub, attrs = '') => `<li><button class="tx" data-act="${act}" ${attrs}><span class="tile ${tile}">${icon(ic)}</span><span class="tx-main"><span class="tx-title">${title}</span><span class="tx-sub">${sub}</span></span>${icon('chev', 'chev')}</button></li>`;
  const checkSub = w => { const c = lastCheck(w); return `По записям ${moneyText(T.bal[w])} · ${c ? 'сверено ' + ago(c.ts) : 'ещё не сверял'}`; };
  return `
  <header class="sec-head big"><h2>Ещё</h2></header>
  <section class="block"><h3 class="sec-label">Сверка остатка</h3><div class="card"><ul class="txs">
    ${row('check', 'scale', 't-kaspi', 'Сверить Kaspi', checkSub('kaspi'), 'data-wallet="kaspi"')}
    ${row('check', 'scale', 't-cash', 'Сверить наличные', checkSub('cash'), 'data-wallet="cash"')}
  </ul></div></section>
  <section class="block"><h3 class="sec-label">Настройка</h3><div class="card"><ul class="txs">
    ${row('cats', 'tag', 't-accent', 'Категории расходов', S.categories.map(c => esc(c.name)).join(', '))}
  </ul></div></section>
  <section class="block"><h3 class="sec-label">Данные</h3><div class="card"><ul class="txs">
    ${row('report', 'text', 't-accent', 'Отчёт текстом', 'Дата, категория, описание, сумма — скопировать или отправить')}
    ${PREVIEW ? '' : row('export', 'download', 't-accent', 'Сохранить копию в файл', `JSON · ${n} ${plural(n, 'запись', 'записи', 'записей')} · ${le ? 'последняя копия ' + ago(le) : 'копий ещё не было'}`)}
    ${row('import', 'upload', 't-mute', 'Загрузить из файла', 'Заменит текущие данные содержимым JSON-файла')}
  </ul></div>
  <p class="note">${PREVIEW
    ? 'Это версия для просмотра внутри Claude. Записи лежат в памяти этой страницы на этом устройстве и могут пропасть, а сохранить копию в файл здесь нельзя. Постоянный учёт лучше вести в основном приложении.'
    : 'Данные лежат только на этом устройстве, в памяти браузера. Сохраняй копию раз в пару недель: если очистить данные браузера или сменить телефон, без файла записи не вернуть.'}</p></section>
  ${PREVIEW ? '' : `<section class="block"><h3 class="sec-label">Оформление</h3><div class="seg" role="group" aria-label="Тема">
    ${[['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([v, l]) => `<button class="${theme === v ? 'on' : ''}" data-act="theme" data-v="${v}" aria-pressed="${theme === v}">${l}</button>`).join('')}
  </div></section>`}
  ${standalone || PREVIEW ? '' : `<section class="block"><h3 class="sec-label">Установка</h3>${deferredInstall
    ? `<button class="btn primary wide" data-act="install">${icon('phone')} Установить на главный экран</button>`
    : `<p class="note">${ios ? 'В Safari нажми «Поделиться», затем «На экран „Домой“» — появится иконка, как у обычного приложения.' : 'Открой меню браузера (⋮) и выбери «Установить приложение» или «Добавить на главный экран».'}</p>`}</section>`}
  <section class="block"><button class="btn ghost danger wide" data-act="reset">Стереть все данные</button></section>
  <p class="ver">Тиын · версия 2${PREVIEW ? ' · для просмотра' : ''}</p>`;
}

function onboardingHtml() {
  return `<section class="onb">
    <div class="hero-sun onb-sun" aria-hidden="true"></div>
    <h1 class="onb-title">Тиын</h1>
    <p class="onb-lead">Считает, куда ушли деньги, кто сколько должен и сходится ли всё с Kaspi.</p>
    <div class="card pad">
      <label class="field"><span class="label">Сейчас на Kaspi</span><span class="money-input"><input class="input" id="onb-kaspi" inputmode="decimal" autocomplete="off" placeholder="0"><span>₸</span></span></label>
      <label class="field"><span class="label">Наличными</span><span class="money-input"><input class="input" id="onb-cash" inputmode="decimal" autocomplete="off" placeholder="0"><span>₸</span></span></label>
      <button class="btn primary wide" data-act="onb-start">Начать</button>
    </div>
    <button class="link" data-act="import">У меня есть файл с копией данных (JSON)</button>
    ${PREVIEW ? '<p class="note">Версия для просмотра внутри Claude: записи здесь могут пропасть.</p>' : ''}
  </section>`;
}

function render() {
  document.body.classList.toggle('onboarding', !S);
  const view = $('#view');
  if (!S) { view.innerHTML = onboardingHtml(); return; }
  $$('.tab').forEach(b => {
    const on = b.dataset.tab === ui.tab;
    b.classList.toggle('on', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  view.innerHTML = ({ home: homeHtml, history: historyHtml, debts: debtsHtml, more: moreHtml }[ui.tab] || homeHtml)();
}

function refresh() {
  cache = null;
  render();
  sheetStack.forEach(s => s.render());
}

/* ================= sheets ================= */

const sheetStack = [];
let closing = false;

function openSheet(renderFn, opts = {}) {
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = '<div class="backdrop" data-act="close"></div><section class="sheet" role="dialog" aria-modal="true"><div class="grab" aria-hidden="true"></div><div class="sheet-body"></div></section>';
  $('#sheets').appendChild(el);
  const api = {
    el,
    body: $('.sheet-body', el),
    handlers: opts.handlers || {},
    onInput: opts.onInput,
    onEnter: opts.onEnter,
    render() { this.body.innerHTML = renderFn(this); if (opts.after) opts.after(this); },
  };
  sheetStack.push(api);
  if (!PREVIEW) history.pushState({ sheet: sheetStack.length }, '');
  document.documentElement.classList.add('sheet-open');
  api.render();
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
  return api;
}

function closeTop() {
  if (closing || !sheetStack.length) return;
  if (PREVIEW) { popSheet(); return; }
  closing = true;
  history.back();
}

function popSheet() {
  closing = false;
  const s = sheetStack.pop();
  if (!s) return;
  s.el.classList.remove('open');
  setTimeout(() => s.el.remove(), 280);
  if (!sheetStack.length) document.documentElement.classList.remove('sheet-open');
  refresh();
}
window.addEventListener('popstate', popSheet);

const sheetHead = title => `<header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-act="close" aria-label="Закрыть">${icon('x')}</button></header>`;
const seg = (act, cur, items, label) => `<div class="seg" role="group" aria-label="${label}">${items.map(([v, l]) => `<button type="button" class="${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`).join('')}</div>`;
/* Поле описания растёт вместе с текстом, чтобы длинный список покупок был виден целиком. */
const grow = el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 2 + 'px'; } };
const focusFirst = a => { if (!a.focused) { a.focused = true; setTimeout(() => { const i = $('input', a.body); if (i) i.focus(); }, 280); } };

function confirmSheet({ title, text, yes, danger, onYes }) {
  openSheet(() => `${sheetHead(title)}<p class="sheet-text">${text}</p>
    <footer class="sheet-foot"><button class="btn ghost" data-act="close">Отмена</button><button class="btn ${danger ? 'danger-solid' : 'primary'}" data-act="yes">${esc(yes)}</button></footer>`,
    { handlers: { yes: () => { onYes(); closeTop(); } } });
}

function openNameSheet({ title, value = '', onSave }) {
  let name = value, error = '';
  const api = openSheet(() => `${sheetHead(title)}
    <label class="field"><span class="label">Имя</span><input class="input" data-f="name" value="${esc(name)}" maxlength="30" autocomplete="off" enterkeyhint="done"></label>
    <p class="form-error" role="alert">${esc(error)}</p>
    <footer class="sheet-foot"><button class="btn primary" data-act="save">Сохранить</button></footer>`, {
    onInput: el => { name = el.value; },
    onEnter: () => api.handlers.save(),
    after: focusFirst,
    handlers: {
      save: () => {
        const n = name.trim();
        if (!n) { error = 'Напиши имя.'; return api.render(); }
        const problem = onSave(n);
        if (problem) { error = problem; return api.render(); }
        closeTop();
      },
    },
  });
}

/* ---------- запись: расход, приход, перевод, долг, исправление ---------- */

function openTxForm(init = {}) {
  const ex = init.id ? S.tx.find(t => t.id === init.id) : null;
  if (init.id && !ex) return;
  const t = ex || init;
  const exShares = (ex && !ex.paidBy && ex.shares) || [];
  const F = {
    type: t.type || 'expense',
    amount: ex ? toInput(ex.type === 'adjust' ? ex.delta : ex.amount) : (init.amount ? toInput(init.amount) : ''),
    date: t.date || ymd(),
    note: t.note || '',
    category: t.category || S.settings.lastCat || S.categories[0].id,
    src: t.paidBy ? 'other' : ((t.type === 'expense' && t.wallet) || S.settings.lastWallet || 'kaspi'),
    payer: t.paidBy || null,
    wallet: (t.type !== 'expense' && t.wallet) || S.settings.lastWallet || 'kaspi',
    shared: exShares.length > 0,
    sel: new Set(exShares.map(s => s.person)),
    mode: exShares.length ? 'manual' : 'equal',
    includeMe: true,
    manual: Object.fromEntries(exShares.map(s => [s.person, toInput(s.amount)])),
    from: t.from || 'kaspi',
    dir: t.dir || 'lend',
    person: t.person || null,
    newName: '',
    confirmDel: false,
    error: '',
  };
  if (!S.categories.some(c => c.id === F.category)) F.category = S.categories[0].id;

  const calcShares = () => {
    const amt = parseAmt(F.amount), ids = [...F.sel];
    if (!ids.length) return [];
    if (F.mode === 'manual') return ids.map(id => ({ person: id, amount: parseAmt(F.manual[id]) }));
    if (F.includeMe) { const each = Math.floor(amt / (ids.length + 1)); return ids.map(id => ({ person: id, amount: each })); }
    const each = Math.floor(amt / ids.length), rem = r2(amt - each * ids.length);
    return ids.map((id, i) => ({ person: id, amount: r2(each + (i ? 0 : rem)) }));
  };

  const peopleChips = (act, isOn) => S.people.length ? `<div class="chips">${S.people.map(p => `<button type="button" class="chip ${isOn(p.id) ? 'on' : ''}" data-act="${act}" data-v="${esc(p.id)}" aria-pressed="${isOn(p.id)}">${esc(p.name)}</button>`).join('')}</div>` : '';
  const addPerson = () => `<div class="add-person"><input class="input" data-f="newName" value="${esc(F.newName)}" placeholder="${S.people.length ? 'Добавить ещё имя' : 'Имя человека'}" maxlength="30" autocomplete="off" enterkeyhint="done" aria-label="Имя нового человека"><button type="button" class="btn ghost" data-act="addp">Добавить</button></div>`;
  const walletSeg = label => `<div class="field"><span class="label">${label}</span>${seg('wallet', F.wallet, WALLETS.map(w => [w.id, w.name]), label)}</div>`;

  const expenseFields = () => {
    const cats = `<div class="field"><span class="label">Категория</span><div class="chips">${S.categories.map(c => `<button type="button" class="chip cat c${c.color} ${F.category === c.id ? 'on' : ''}" data-act="cat" data-v="${esc(c.id)}" aria-pressed="${F.category === c.id}">${icon(c.icon)}${esc(c.name)}</button>`).join('')}</div></div>`;
    const payer = `<div class="field"><span class="label">Кто платил</span>${seg('src', F.src, [['kaspi', 'Я, Kaspi'], ['cash', 'Я, наличные'], ['other', 'Не я']], 'Кто платил')}
      ${F.src === 'other' ? `<p class="hint">Трата твоя, но деньги из кошелька не уходят. Запишу, что ты должен этому человеку.</p>${peopleChips('payer', id => F.payer === id)}${addPerson()}` : ''}</div>`;
    let share = '';
    if (F.src !== 'other') {
      share = `<label class="switch"><input type="checkbox" data-f="shared" ${F.shared ? 'checked' : ''}><span class="switch-ui"></span><span class="switch-text"><b>Общая покупка</b><small>часть суммы мне вернут</small></span></label>`;
      if (F.shared) {
        share += `<div class="share-box"><span class="label">С кем делим</span>${peopleChips('share', id => F.sel.has(id))}${addPerson()}
          ${F.sel.size ? `${seg('mode', F.mode, [['equal', 'Поровну'], ['manual', 'Вручную']], 'Как делим')}
            ${F.mode === 'equal' ? `<label class="check"><input type="checkbox" data-f="includeMe" ${F.includeMe ? 'checked' : ''}>Я тоже в доле</label>` : ''}
            <ul class="share-list">${[...F.sel].map(id => `<li><span class="who">${esc(personName(id))}</span>${F.mode === 'manual'
              ? `<input class="input" inputmode="decimal" autocomplete="off" data-share="${esc(id)}" value="${esc(F.manual[id] || '')}" placeholder="0" aria-label="Сколько вернёт ${esc(personName(id))}">`
              : `<span class="share-val" data-eq="${esc(id)}"></span>`}</li>`).join('')}</ul>
            <p class="share-sum" id="share-sum"></p>` : `<p class="hint">Выбери людей или добавь нового.</p>`}
        </div>`;
      }
    }
    return cats + payer + share;
  };

  const debtFields = () => {
    const v = F.person ? (totals().debt[F.person] || 0) : 0;
    const canFill = F.person && ((F.dir === 'returned' && v > 0) || (F.dir === 'repay' && v < 0));
    const opts = [['lend', 'Дал в долг', 'деньги ушли'], ['returned', 'Мне вернули', 'деньги пришли'], ['borrow', 'Взял в долг', 'деньги пришли'], ['repay', 'Я вернул', 'деньги ушли']];
    return `<div class="field"><span class="label">Кто</span>${peopleChips('person', id => F.person === id)}${addPerson()}</div>
      <div class="field"><span class="label">Что произошло</span><div class="opts">${opts.map(([d, b, s]) => `<button type="button" class="opt ${F.dir === d ? 'on' : ''}" data-act="dir" data-v="${d}" aria-pressed="${F.dir === d}"><b>${b}</b><small>${s}</small></button>`).join('')}</div></div>
      ${F.person ? `<p class="hint">Сейчас: ${v > 0 ? `${esc(personName(F.person))} должен(на) мне ${moneyText(v)}` : v < 0 ? `я должен ${esc(personName(F.person))} ${moneyText(-v)}` : 'мы в расчёте'}.${canFill ? ` <button type="button" class="link" data-act="fill">Вся сумма</button>` : ''}</p>` : ''}
      ${walletSeg('Кошелёк')}`;
  };

  const html = () => {
    const adj = F.type === 'adjust';
    let fields = '';
    if (F.type === 'expense') fields = expenseFields();
    else if (F.type === 'income') fields = walletSeg('Куда пришли');
    else if (F.type === 'transfer') fields = `<div class="field"><span class="label">Откуда и куда</span><div class="opts">
        <button type="button" class="opt ${F.from === 'kaspi' ? 'on' : ''}" data-act="from" data-v="kaspi"><b>Kaspi → наличные</b><small>снял с карты</small></button>
        <button type="button" class="opt ${F.from === 'cash' ? 'on' : ''}" data-act="from" data-v="cash"><b>Наличные → Kaspi</b><small>положил на карту</small></button></div></div>`;
    else if (F.type === 'debt') fields = debtFields();
    else fields = `${walletSeg('Кошелёк')}<p class="hint">Плюс — денег стало больше, минус — меньше. Например: −500.</p>`;
    const ph = { expense: 'На что: хлеб, молоко, яйца…', income: 'Откуда: стипендия, перевод от родителей…', transfer: 'Необязательно', debt: 'За что', adjust: 'Причина' }[F.type];
    return `${sheetHead(ex ? 'Изменить запись' : 'Новая запись')}
      ${adj ? '' : seg('type', F.type, [['expense', 'Расход'], ['income', 'Приход'], ['transfer', 'Перевод'], ['debt', 'Долг']], 'Тип записи')}
      <label class="amount-field"><span class="sr">Сумма</span><input id="f-amount" data-f="amount" inputmode="${adj ? 'text' : 'decimal'}" autocomplete="off" placeholder="0" value="${esc(F.amount)}"><span class="cur">₸</span></label>
      <label class="field"><span class="label">Описание</span><textarea class="input area" data-f="note" rows="1" maxlength="${NOTE_MAX}" placeholder="${ph}" autocomplete="off">${esc(F.note)}</textarea></label>
      ${fields}
      <label class="field"><span class="label">Дата</span><input class="input" type="date" data-f="date" value="${esc(F.date)}"></label>
      <p class="form-error" role="alert">${esc(F.error)}</p>
      <footer class="sheet-foot">${ex ? (F.confirmDel
        ? `<button type="button" class="btn danger-solid" data-act="del-yes">Точно удалить</button>`
        : `<button type="button" class="btn ghost danger" data-act="del" aria-label="Удалить запись">${icon('trash')}</button>`) : ''}
        <button type="button" class="btn primary" data-act="save">${ex ? 'Сохранить' : 'Записать'}</button></footer>`;
  };

  /* Обновляет доли и итог под ними, не трогая поля ввода (чтобы не сбивать набор). */
  const derived = a => {
    if (F.type !== 'expense' || !F.shared || F.src === 'other') return;
    const sh = calcShares(), amt = parseAmt(F.amount);
    const back = r2(sh.reduce((s, x) => s + x.amount, 0));
    for (const el of $$('[data-eq]', a.body)) { const s = sh.find(x => x.person === el.dataset.eq); el.innerHTML = money(s ? s.amount : 0); }
    const sum = $('#share-sum', a.body);
    if (!sum) return;
    const over = back > amt;
    sum.classList.toggle('bad', over && amt > 0);
    sum.innerHTML = !amt ? 'Введи сумму покупки — посчитаю доли.'
      : over ? `Доли (${moneyText(back)}) больше суммы покупки.`
      : `Вернут <b>${moneyText(back)}</b> · моя доля <b>${moneyText(r2(amt - back))}</b>`;
  };

  const fail = msg => { F.error = msg; const el = $('.form-error', api.body); if (el) { el.textContent = msg; el.scrollIntoView({ block: 'nearest' }); } };

  const api = openSheet(html, {
    after: a => { derived(a); grow($('textarea', a.body)); if (!ex && !a.focused) { a.focused = true; setTimeout(() => { const i = $('#f-amount', a.body); if (i && !i.value) i.focus(); }, 280); } },
    onInput: el => {
      if (el.dataset.share) { F.manual[el.dataset.share] = el.value; derived(api); return; }
      const f = el.dataset.f;
      if (!f) return;
      if (el.type === 'checkbox') { F[f] = el.checked; api.render(); return; }
      F[f] = el.value;
      if (f === 'amount') derived(api);
      else if (f === 'note') grow(el);
    },
    onEnter: el => { if (el.dataset.f === 'newName') api.handlers.addp(); else if (el.dataset.f === 'amount' || el.dataset.f === 'note') el.blur(); },
    handlers: {
      type: el => { F.type = el.dataset.v; F.error = ''; api.render(); },
      cat: el => { F.category = el.dataset.v; api.render(); },
      src: el => { F.src = el.dataset.v; api.render(); },
      wallet: el => { F.wallet = el.dataset.v; api.render(); },
      payer: el => { F.payer = el.dataset.v; api.render(); },
      share: el => { const id = el.dataset.v; if (F.sel.has(id)) F.sel.delete(id); else F.sel.add(id); api.render(); },
      mode: el => {
        if (el.dataset.v === 'manual' && F.mode !== 'manual') for (const s of calcShares()) F.manual[s.person] = s.amount ? toInput(s.amount) : '';
        F.mode = el.dataset.v;
        api.render();
      },
      from: el => { F.from = el.dataset.v; api.render(); },
      dir: el => { F.dir = el.dataset.v; api.render(); },
      person: el => { F.person = el.dataset.v; api.render(); },
      fill: () => { F.amount = toInput(Math.abs(totals().debt[F.person] || 0)); api.render(); },
      addp: () => {
        const name = F.newName.trim().slice(0, 30);
        if (!name) { toast('Напиши имя'); return; }
        let p = S.people.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!p) { p = { id: uid(), name }; S.people.push(p); save(); }
        F.newName = '';
        if (F.type === 'debt') F.person = p.id;
        else if (F.src === 'other') F.payer = p.id;
        else F.sel.add(p.id);
        api.render();
        /* Оставляем курсор в поле имени, чтобы можно было сразу добавить следующего человека. */
        if (F.type === 'expense' && F.src !== 'other') { const i = $('[data-f="newName"]', api.body); if (i) i.focus({ preventScroll: true }); }
      },
      del: () => { F.confirmDel = true; api.render(); },
      'del-yes': () => { S.tx = S.tx.filter(x => x.id !== ex.id); save(); toast('Запись удалена'); closeTop(); },
      save: () => {
        const amt = parseAmt(F.amount);
        if (F.type !== 'adjust' && !(amt > 0)) return fail('Введи сумму больше нуля.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(F.date)) return fail('Укажи дату.');
        const base = { id: ex ? ex.id : uid(), ts: ex ? ex.ts : Date.now(), type: F.type, date: F.date, note: F.note.trim() };
        let rec;
        if (F.type === 'expense') {
          if (F.src === 'other') {
            if (!F.payer) return fail('Выбери, кто заплатил за тебя.');
            rec = { ...base, amount: amt, category: F.category, paidBy: F.payer };
          } else {
            let sh = [];
            if (F.shared) {
              if (!F.sel.size) return fail('Выбери, с кем делишь покупку.');
              sh = calcShares().filter(s => s.amount > 0);
              if (!sh.length) return fail('Укажи, сколько вернёт каждый.');
              if (r2(sh.reduce((a, s) => a + s.amount, 0)) > amt) return fail('Доли больше, чем сумма покупки.');
            }
            rec = { ...base, amount: amt, category: F.category, wallet: F.src, shares: sh };
            S.settings.lastWallet = F.src;
          }
          S.settings.lastCat = F.category;
        } else if (F.type === 'income') {
          rec = { ...base, amount: amt, wallet: F.wallet };
        } else if (F.type === 'transfer') {
          rec = { ...base, amount: amt, from: F.from, to: F.from === 'kaspi' ? 'cash' : 'kaspi' };
        } else if (F.type === 'debt') {
          if (!F.person) return fail('Выбери человека или добавь нового.');
          rec = { ...base, amount: amt, dir: F.dir, person: F.person, wallet: F.wallet };
        } else {
          const d = parseSigned(F.amount);
          if (!d) return fail('Введи сумму, например −500 или 1200.');
          rec = { ...base, delta: d, wallet: F.wallet };
        }
        if (ex) S.tx = S.tx.map(x => (x.id === ex.id ? rec : x)); else S.tx.push(rec);
        save();
        toast(ex ? 'Сохранено' : 'Записано');
        closeTop();
      },
    },
  });
}

/* ---------- сверка остатка ---------- */

function openCheck(wallet) {
  const C = { wallet: wallet === 'cash' ? 'cash' : 'kaspi', actual: '', cat: 'other' };
  const expected = () => r2(totals().bal[C.wallet] || 0);
  const isK = () => C.wallet === 'kaspi';

  const result = () => {
    if (!C.actual.trim()) return '';
    const diff = r2(expected() - parseAmt(C.actual));
    if (diff === 0) return `<div class="verdict ok"><p class="v-title">${icon('check')}<span>Всё сходится</span></p><p class="v-sub">Записи совпадают с остатком до тиына.</p><button class="btn primary" data-act="mark-ok">Отметить сверку</button></div>`;
    if (diff > 0) {
      const L = lastCheck(C.wallet), rec = outSince(C.wallet, L ? L.ts : 0);
      return `<div class="verdict">
        <p class="v-title"><span>${isK() ? 'В Kaspi потрачено' : 'Наличных потрачено'} на <b>${moneyText(diff)}</b> больше, чем записано здесь</span></p>
        <p class="v-sub">${L ? `С прошлой сверки (${dayLabel(L.date).toLowerCase()})` : 'За всё время'} здесь записано расходов на ${moneyText(rec)}, а на деле ушло ${moneyText(r2(rec + diff))}.</p>
        <span class="label">Куда записать разницу</span>
        <div class="chips">${S.categories.map(c => `<button type="button" class="chip cat c${c.color} ${C.cat === c.id ? 'on' : ''}" data-act="cat" data-v="${esc(c.id)}" aria-pressed="${C.cat === c.id}">${icon(c.icon)}${esc(c.name)}</button>`).join('')}</div>
        <div class="btn-row"><button class="btn primary" data-act="as-expense">Записать как расход</button><button class="btn ghost" data-act="just-fix">Только исправить баланс</button></div>
      </div>`;
    }
    return `<div class="verdict info">
      <p class="v-title"><span>${isK() ? 'В Kaspi' : 'Наличных'} на <b>${moneyText(-diff)}</b> больше, чем по записям</span></p>
      <p class="v-sub">Похоже, не записан приход или чей-то возврат.</p>
      <div class="btn-row"><button class="btn primary" data-act="as-income">Записать как приход</button><button class="btn ghost" data-act="just-fix">Только исправить баланс</button></div>
    </div>`;
  };

  const finish = (action, tx, msg) => {
    const exp = expected(), act = parseAmt(C.actual), now = Date.now();
    if (tx) S.tx.push({ id: uid(), ts: now, date: ymd(), ...tx });
    S.checks.push({ id: uid(), ts: now + 1, date: ymd(), wallet: C.wallet, expected: exp, actual: act, diff: r2(exp - act), action });
    save();
    toast(msg);
    closeTop();
  };
  const diffNow = () => r2(expected() - parseAmt(C.actual));
  const labels = { ok: 'всё сошлось', expense: 'записано как расход', income: 'записано как приход', adjust: 'баланс исправлен' };

  const api = openSheet(() => {
    const hist = S.checks.filter(c => c.wallet === C.wallet).slice(-5).reverse();
    return `${sheetHead('Сверка остатка')}
      <div class="seg" role="group" aria-label="Кошелёк">${WALLETS.map(w => `<button type="button" class="${C.wallet === w.id ? 'on' : ''}" data-act="wallet" data-v="${w.id}" aria-pressed="${C.wallet === w.id}">${w.name}</button>`).join('')}</div>
      <div class="kv"><span>По записям должно быть</span><strong>${money(expected())}</strong></div>
      <div class="field"><span class="label">Сколько на самом деле</span>
        <label class="amount-field"><span class="sr">Остаток на самом деле</span><input id="c-actual" data-f="actual" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(C.actual)}"><span class="cur">₸</span></label>
        <p class="hint">${isK() ? 'Открой приложение Kaspi и введи остаток на Kaspi Gold.' : 'Пересчитай наличные и введи сумму.'}</p></div>
      <div id="check-result">${result()}</div>
      ${hist.length ? `<h3>Прошлые сверки</h3><div class="card flat"><ul class="txs">${hist.map(c => `<li><div class="tx">
        <span class="tile ${c.diff ? 't-mute' : 't-pos'}">${icon(c.diff ? 'scale' : 'check')}</span>
        <span class="tx-main"><span class="tx-title">${dayLabel(c.date)}</span><span class="tx-sub">${labels[c.action] || ''}</span></span>
        <span class="tx-amt mute">${c.diff ? money(Math.abs(c.diff)) : ''}</span></div></li>`).join('')}</ul></div>` : '<div></div>'}`;
  }, {
    after: focusFirst,
    onInput: el => { if (el.dataset.f === 'actual') { C.actual = el.value; $('#check-result', api.body).innerHTML = result(); } },
    onEnter: el => el.blur(),
    handlers: {
      wallet: el => { C.wallet = el.dataset.v; C.actual = ''; api.render(); },
      cat: el => { C.cat = el.dataset.v; $('#check-result', api.body).innerHTML = result(); },
      'mark-ok': () => finish('ok', null, 'Сверено'),
      'as-expense': () => finish('expense', { type: 'expense', amount: diffNow(), category: C.cat, wallet: C.wallet, shares: [], note: 'Незаписанные траты' }, 'Разница записана как расход'),
      'as-income': () => finish('income', { type: 'income', amount: -diffNow(), wallet: C.wallet, note: 'Незаписанный приход' }, 'Разница записана как приход'),
      'just-fix': () => finish('adjust', { type: 'adjust', delta: -diffNow(), wallet: C.wallet, note: 'Сверка остатка' }, 'Баланс исправлен'),
    },
  });
}

/* ---------- человек ---------- */

function openPerson(id) {
  let confirmDel = false;
  const debtForm = (dir, amount) => openTxForm({ type: 'debt', person: id, dir, amount });
  const api = openSheet(() => {
    const p = S.people.find(x => x.id === id);
    if (!p) return sheetHead('Человек удалён');
    const v = totals().debt[id] || 0, st = personStats(id);
    const list = sortedTx().filter(t => involves(t, id));
    const row = t => {
      const d = txEffect(t).p[id] || 0, view = txView(t);
      return `<li><button class="tx" data-act="tx" data-id="${esc(t.id)}"><span class="tile ${view.tile}">${icon(view.icon)}</span>
        <span class="tx-main"><span class="tx-title">${esc(view.title)}</span><span class="tx-sub">${dayLabel(t.date)}</span></span>
        <span class="tx-amt ${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}">${money(d, 'always')}</span></button></li>`;
    };
    return `<header class="sheet-head"><div class="p-head"><span class="avatar" style="--h:${hue(p.name)}">${esc([...p.name][0].toUpperCase())}</span><h2>${esc(p.name)}</h2></div>
        <button class="icon-btn" data-act="close" aria-label="Закрыть">${icon('x')}</button></header>
      <p class="p-status ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">${v > 0 ? `должен(на) мне ${money(v)}` : v < 0 ? `я должен ${money(-v)}` : 'мы в расчёте'}</p>
      <div class="stats4">
        <div class="stat"><span class="stat-label">Я потратил</span><span class="stat-val">${money(st.spent)}</span></div>
        <div class="stat"><span class="stat-label">Мне вернули</span><span class="stat-val">${money(st.got)}</span></div>
        ${st.took || st.gave ? `<div class="stat"><span class="stat-label">Я брал</span><span class="stat-val">${money(st.took)}</span></div>
        <div class="stat"><span class="stat-label">Я вернул</span><span class="stat-val">${money(st.gave)}</span></div>` : ''}
      </div>
      <div class="opts">
        <button class="opt ${v > 0 ? 'on' : ''}" data-act="got"><b>Мне вернули</b><small>${v > 0 ? 'всё: ' + moneyText(v) : 'деньги пришли'}</small></button>
        <button class="opt ${v < 0 ? 'on' : ''}" data-act="gave"><b>Я вернул</b><small>${v < 0 ? 'всё: ' + moneyText(-v) : 'деньги ушли'}</small></button>
        <button class="opt" data-act="lend"><b>Дал в долг</b><small>деньги ушли</small></button>
        <button class="opt" data-act="borrow"><b>Взял в долг</b><small>деньги пришли</small></button>
      </div>
      ${list.length ? `<h3>История</h3><p class="hint">Плюс — долг передо мной вырос, минус — уменьшился.</p><div class="card flat"><ul class="txs">${list.map(row).join('')}</ul></div>` : `<p class="hint">Записей с этим человеком пока нет.</p>`}
      <div class="btn-row"><button class="btn ghost" data-act="rename">${icon('edit')} Переименовать</button>
        ${list.length ? '' : (confirmDel ? `<button class="btn danger-solid" data-act="del-yes">Точно удалить</button>` : `<button class="btn ghost danger" data-act="del">${icon('trash')} Удалить</button>`)}</div>`;
  }, {
    handlers: {
      got: () => { const v = totals().debt[id] || 0; debtForm('returned', v > 0 ? v : 0); },
      gave: () => { const v = totals().debt[id] || 0; debtForm('repay', v < 0 ? -v : 0); },
      lend: () => debtForm('lend', 0),
      borrow: () => debtForm('borrow', 0),
      rename: () => {
        const p = S.people.find(x => x.id === id);
        openNameSheet({ title: 'Переименовать', value: p.name, onSave: n => {
          if (S.people.some(x => x.id !== id && x.name.toLowerCase() === n.toLowerCase())) return 'Такой человек уже есть.';
          p.name = n; save();
        } });
      },
      del: () => { confirmDel = true; api.render(); },
      'del-yes': () => { S.people = S.people.filter(x => x.id !== id); save(); toast('Удалено'); closeTop(); },
    },
  });
}

/* ---------- категории ---------- */

function openCats() {
  openSheet(() => `${sheetHead('Категории')}
    <div class="card flat"><ul class="txs">${S.categories.map(c => `<li><button class="tx" data-act="edit" data-id="${esc(c.id)}"><span class="tile c${c.color}">${icon(c.icon)}</span><span class="tx-main"><span class="tx-title">${esc(c.name)}</span></span>${icon('edit', 'chev')}</button></li>`).join('')}</ul></div>
    <button class="btn ghost wide" data-act="new">${icon('plus')} Новая категория</button>`,
    { handlers: { edit: el => openCatForm(el.dataset.id), new: () => openCatForm(null) } });
}

function openCatForm(id) {
  const src = id ? S.categories.find(c => c.id === id) : null;
  const C = src ? { ...src } : { name: '', icon: 'cart', color: 1 + (S.categories.length % COLORS) };
  const used = id ? S.tx.filter(t => t.category === id).length : 0;
  let confirmDel = false, error = '';
  const api = openSheet(() => `${sheetHead(src ? 'Категория' : 'Новая категория')}
    <label class="field"><span class="label">Название</span><input class="input" data-f="name" value="${esc(C.name)}" maxlength="24" autocomplete="off" placeholder="Например: Кафе"></label>
    <div class="field"><span class="label">Значок</span><div class="icon-grid c${C.color}">${CAT_ICONS.map(n => `<button type="button" class="icon-pick ${C.icon === n ? 'on' : ''}" data-act="icon" data-v="${n}" aria-label="Значок ${n}" aria-pressed="${C.icon === n}">${icon(n)}</button>`).join('')}</div></div>
    <div class="field"><span class="label">Цвет</span><div class="swatches">${Array.from({ length: COLORS }, (_, i) => `<button type="button" class="swatch c${i + 1} ${C.color === i + 1 ? 'on' : ''}" data-act="color" data-v="${i + 1}" aria-label="Цвет ${i + 1}" aria-pressed="${C.color === i + 1}"></button>`).join('')}</div></div>
    ${confirmDel ? `<p class="hint">${used ? `${used} ${plural(used, 'запись', 'записи', 'записей')} из этой категории ${plural(used, 'перейдёт', 'перейдут', 'перейдут')} в «${esc(cat('other').name)}».` : 'В этой категории нет записей.'}</p>` : ''}
    <p class="form-error" role="alert">${esc(error)}</p>
    <footer class="sheet-foot">${src && id !== 'other' ? (confirmDel
      ? `<button type="button" class="btn danger-solid" data-act="del-yes">Точно удалить</button>`
      : `<button type="button" class="btn ghost danger" data-act="del" aria-label="Удалить категорию">${icon('trash')}</button>`) : ''}
      <button type="button" class="btn primary" data-act="save">Сохранить</button></footer>`, {
    after: a => { if (!src) focusFirst(a); },
    onInput: el => { if (el.dataset.f === 'name') C.name = el.value; },
    onEnter: el => el.blur(),
    handlers: {
      icon: el => { C.icon = el.dataset.v; api.render(); },
      color: el => { C.color = Number(el.dataset.v); api.render(); },
      del: () => { confirmDel = true; api.render(); },
      'del-yes': () => {
        S.categories = S.categories.filter(c => c.id !== id);
        S.tx.forEach(t => { if (t.category === id) t.category = 'other'; });
        if (S.settings.lastCat === id) delete S.settings.lastCat;
        if (ui.fcat === id) ui.fcat = '';
        save(); toast('Категория удалена'); closeTop();
      },
      save: () => {
        const name = C.name.trim();
        if (!name) { error = 'Напиши название.'; return api.render(); }
        if (S.categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) { error = 'Такая категория уже есть.'; return api.render(); }
        if (src) Object.assign(src, { name, icon: C.icon, color: C.color });
        else S.categories.splice(Math.max(0, S.categories.findIndex(c => c.id === 'other')), 0, { id: uid(), name, icon: C.icon, color: C.color });
        save(); toast('Сохранено'); closeTop();
      },
    },
  });
}

/* ================= data in and out ================= */

async function exportData() {
  const name = `tiyn-${ymd()}.json`;
  const file = new File([JSON.stringify(S, null, 2)], name, { type: 'application/json' });
  const done = () => { S.settings.lastExport = Date.now(); save(); render(); };
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Тиын — копия данных' });
      done();
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  downloadFile(file);
  done();
  toast(`Файл ${name} сохранён в загрузки`);
}

function downloadFile(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch (e) { /* нет доступа к буферу — пробуем по-старому */ }
  const ta = document.createElement('textarea');
  ta.value = txt;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { /* не поддерживается */ }
  ta.remove();
  return ok;
}

/* ================= text report ================= */

/* Обычный текст вместо JSON: строка на запись — дата | категория | описание | сумма | подробности.
   period — 'ГГГГ-ММ' или 'all'; scope — 'expense' (только расходы) или 'all' (все записи). */
function reportText(period, scope) {
  const tg = n => (r2(n) < 0 ? '−' : '') + num(n).replace(/[  ]/g, ' ') + ' ₸';
  const dmy = s => String(s).split('-').reverse().join('.');
  const flat = s => String(s || '').trim().replace(/([:;,.])?\s*\n+\s*/g, (m, p) => (p ? p + ' ' : '; ')).replace(/\|/g, '/');
  const all = scope !== 'expense';
  const list = S.tx.filter(t => period === 'all' || ym(t.date) === period)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.ts - b.ts));
  const exp = list.filter(t => t.type === 'expense');
  const rows = all ? list : exp;

  const line = t => {
    let c, sum;
    const more = [];
    if (t.type === 'expense') {
      c = cat(t.category).name;
      sum = (all ? '−' : '') + tg(t.amount);
      if (t.paidBy) more.push(`платил(а) ${personName(t.paidBy)}, я должен`);
      else {
        more.push(walletName(t.wallet));
        const sh = t.shares || [];
        if (sh.length) more.push(`моя доля ${tg(myShare(t))}`, `доли других: ${sh.map(s => `${personName(s.person)} ${tg(s.amount)}`).join(', ')}`);
      }
    } else if (t.type === 'income') {
      c = 'Приход'; sum = '+' + tg(t.amount); more.push(walletName(t.wallet));
    } else if (t.type === 'transfer') {
      c = 'Перевод'; sum = tg(t.amount); more.push(`${walletName(t.from)} → ${walletName(t.to)}`);
    } else if (t.type === 'debt') {
      const m = { lend: ['Дал в долг', '−'], returned: ['Мне вернули долг', '+'], borrow: ['Взял в долг', '+'], repay: ['Вернул долг', '−'] }[t.dir] || ['Долг', ''];
      c = m[0]; sum = m[1] + tg(t.amount); more.push(personName(t.person), walletName(t.wallet));
    } else {
      c = 'Исправление баланса'; sum = (t.delta > 0 ? '+' : '') + tg(t.delta); more.push(walletName(t.wallet));
    }
    return [dmy(t.date), c, flat(t.note) || '—', sum, more.join('; ')].join(' | ');
  };

  let periodLabel = 'всё время';
  if (period !== 'all') { const [y, m] = period.split('-').map(Number); periodLabel = `${MONTHS[m - 1].toLowerCase()} ${y}`; }
  else if (list.length) periodLabel += ` (с ${dmy(list[0].date)} по ${dmy(list[list.length - 1].date)})`;

  const spent = r2(exp.reduce((a, t) => a + myShare(t), 0));
  const others = r2(exp.reduce((a, t) => a + (t.paidBy ? 0 : (t.shares || []).reduce((x, s) => x + s.amount, 0)), 0));
  const income = r2(list.reduce((a, t) => a + (t.type === 'income' ? t.amount : 0), 0));
  const by = {};
  for (const t of exp) by[t.category] = r2((by[t.category] || 0) + myShare(t));
  const cats = Object.entries(by).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  const T = totals();
  const who = sgn => S.people.map(p => [p.name, sgn * (T.debt[p.id] || 0)]).filter(([, v]) => v > 0);
  const debtLine = (ppl, total) => ppl.length ? `${ppl.map(([n, v]) => `${n} ${tg(v)}`).join(', ')} (всего ${tg(total)})` : 'никто';

  const out = [
    'Тиын — учёт расходов',
    `Период: ${periodLabel}`,
    `Составлено: ${dmy(ymd())}`,
    '',
    'ИТОГО ЗА ПЕРИОД',
    `Потрачено на себя: ${tg(spent)}`,
  ];
  if (others) out.push(`Заплатил за других: ${tg(others)} (не мои траты, эти деньги мне возвращают)`);
  if (all) out.push(`Пришло: ${tg(income)}`);
  if (cats.length) out.push('', 'ПО КАТЕГОРИЯМ (только моя доля)', ...cats.map(([id, v]) => `${cat(id).name}: ${tg(v)}`));
  out.push('', `СЕЙЧАС (на ${dmy(ymd())})`,
    ...WALLETS.map(w => `${w.name}: ${tg(T.bal[w.id] || 0)}`),
    `Мне должны: ${debtLine(who(1), T.owed)}`,
    `Я должен: ${debtLine(who(-1), T.owe).replace(/^никто$/, 'никому')}`,
    '', all ? 'ВСЕ ЗАПИСИ' : 'РАСХОДЫ');
  if (rows.length) out.push('дата | категория | описание | сумма | подробности', ...rows.map(line));
  else out.push('За этот период записей нет.');
  return out.join('\n');
}

function openReport(month) {
  const cur = thisMonth();
  const months = [...new Set([month || cur, cur, shiftMonth(cur, -1)])].slice(0, 2);
  const R = { period: month || cur, scope: 'expense' };
  const canShare = typeof navigator.share === 'function';
  const api = openSheet(() => `${sheetHead('Отчёт текстом')}
    <p class="sheet-text">Обычный текст, по строке на запись: дата, категория, описание, сумма. Скопируй и вставь в Claude, в заметки или в любой чат.</p>
    ${seg('period', R.period, [...months.map(m => [m, monthLabel(m)]), ['all', 'Всё время']], 'Период')}
    ${seg('scope', R.scope, [['expense', 'Только расходы'], ['all', 'Все записи']], 'Что включить')}
    <pre class="report" tabindex="0" aria-label="Текст отчёта">${esc(reportText(R.period, R.scope))}</pre>
    <footer class="sheet-foot">${PREVIEW ? '' : `<button class="btn ghost" data-act="send">${canShare ? 'Отправить' : 'Файл .txt'}</button>`}<button class="btn primary" data-act="copy">${icon('copy')} Скопировать</button></footer>`, {
    handlers: {
      period: el => { R.period = el.dataset.v; api.render(); },
      scope: el => { R.scope = el.dataset.v; api.render(); },
      copy: async () => toast(await copyText(reportText(R.period, R.scope)) ? 'Текст скопирован' : 'Не получилось скопировать. Выдели текст пальцем.'),
      send: async () => {
        const txt = reportText(R.period, R.scope);
        if (canShare) {
          try { await navigator.share({ title: 'Тиын — расходы', text: txt }); return; }
          catch (e) { if (e && e.name === 'AbortError') return; }
        }
        const name = `tiyn-${R.period === 'all' ? 'vse' : R.period}.txt`;
        downloadFile(new File([txt], name, { type: 'text/plain' }));
        toast(`Файл ${name} сохранён в загрузки`);
      },
    },
  });
}

async function importFile(file) {
  let data;
  try { data = normalize(JSON.parse(await file.text())); }
  catch (e) { toast('Не получилось прочитать файл: это не копия данных Тиын'); return; }
  const apply = () => { S = data; save(); applyTheme(); toast('Данные загружены'); };
  if (!S) { apply(); ui.tab = 'home'; render(); return; }
  const n = data.tx.length, m = S.tx.length;
  confirmSheet({
    title: 'Загрузить из файла?',
    text: `В файле ${n} ${plural(n, 'запись', 'записи', 'записей')}. Текущие данные (${m} ${plural(m, 'запись', 'записи', 'записей')}) будут заменены.`,
    yes: 'Заменить',
    onYes: apply,
  });
}

/* ================= theme, toast, install ================= */

function applyTheme() {
  let v = 'auto';
  try { v = (S && S.settings.theme) || localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { /* storage blocked */ }
  if (PREVIEW) return; /* внутри Claude тему задаёт сам Claude */
  if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
  try { localStorage.setItem(THEME_KEY, v); } catch (e) { /* storage blocked */ }
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#EDF2F3';
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  if (S && ui.tab === 'more' && !sheetStack.length) render();
});
window.addEventListener('appinstalled', () => { deferredInstall = null; if (S && !sheetStack.length) render(); });

/* ================= actions ================= */

const A = {
  tab: el => { ui.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  add: () => openTxForm(),
  month: el => { ui.month = shiftMonth(ui.month, Number(el.dataset.by)); render(); },
  filter: el => { ui.filter = el.dataset.v; if (ui.filter !== 'expense') ui.fcat = ''; render(); },
  fcat: el => {
    ui.fcat = el.dataset.v;
    if (el.dataset.go) { ui.tab = 'history'; ui.filter = 'expense'; window.scrollTo(0, 0); }
    render();
  },
  tx: el => openTxForm({ id: el.dataset.id }),
  check: el => openCheck(el.dataset.wallet),
  person: el => openPerson(el.dataset.id),
  'add-debt': () => openTxForm({ type: 'debt' }),
  'add-person': () => openNameSheet({ title: 'Новый человек', onSave: n => {
    if (S.people.some(p => p.name.toLowerCase() === n.toLowerCase())) return 'Такой человек уже есть.';
    S.people.push({ id: uid(), name: n }); save(); toast('Добавлено');
  } }),
  cats: () => openCats(),
  export: () => exportData(),
  report: el => openReport(el.dataset.month),
  import: () => $('#import-file').click(),
  theme: el => { S.settings.theme = el.dataset.v; save(); applyTheme(); render(); },
  install: async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch (e) { /* dismissed */ }
    deferredInstall = null;
    render();
  },
  reset: () => confirmSheet({
    title: 'Стереть все данные?',
    text: 'Все записи, люди и категории удалятся с этого устройства. Вернуть их можно будет только из сохранённого файла.',
    yes: 'Стереть',
    danger: true,
    onYes: () => { try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } S = null; cache = null; ui.tab = 'home'; },
  }),
  'onb-start': () => {
    const k = parseAmt($('#onb-kaspi').value), c = parseAmt($('#onb-cash').value), now = Date.now();
    S = blank();
    try { const th = localStorage.getItem(THEME_KEY); if (th) S.settings.theme = th; } catch (e) { /* storage blocked */ }
    if (k) S.tx.push({ id: uid(), ts: now, type: 'adjust', date: ymd(), wallet: 'kaspi', delta: k, note: 'Начальный остаток' });
    if (c) S.tx.push({ id: uid(), ts: now + 1, type: 'adjust', date: ymd(), wallet: 'cash', delta: c, note: 'Начальный остаток' });
    save();
    render();
    window.scrollTo(0, 0);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const top = sheetStack[sheetStack.length - 1];
  if (top && top.el.contains(el)) {
    if (act === 'close') { closeTop(); return; }
    if (top.handlers[act]) { top.handlers[act](el, e); return; }
  }
  if (A[act]) A[act](el, e);
});

document.addEventListener('input', e => {
  const top = sheetStack[sheetStack.length - 1];
  if (top && top.onInput && top.el.contains(e.target)) top.onInput(e.target, e);
});

document.addEventListener('keydown', e => {
  const top = sheetStack[sheetStack.length - 1];
  if (e.key === 'Escape' && top) { closeTop(); return; }
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  if (top && top.el.contains(e.target)) { if (top.onEnter) { e.preventDefault(); top.onEnter(e.target); } }
  else if (e.target.id === 'onb-kaspi') $('#onb-cash').focus();
  else if (e.target.id === 'onb-cash') A['onb-start']();
});

$('#import-file').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) importFile(f);
});

/* ================= start ================= */

$('#tabs').innerHTML = `
  <button class="tab" data-act="tab" data-tab="home">${icon('home')}<span>Главная</span></button>
  <button class="tab" data-act="tab" data-tab="history">${icon('list')}<span>История</span></button>
  <button class="fab" data-act="add" aria-label="Добавить запись">${icon('plus')}</button>
  <button class="tab" data-act="tab" data-tab="debts">${icon('people')}<span>Долги</span></button>
  <button class="tab" data-act="tab" data-tab="more">${icon('sliders')}<span>Ещё</span></button>`;
$('#top-date').textContent = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
render();

if (!PREVIEW && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
