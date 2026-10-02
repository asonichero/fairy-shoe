// The Fairy Shoe — interface and game flow.
(function () {
'use strict';
const R = window.FairyShoeRules, C = window.FairyShoeContent, B = window.FairyShoeBodies, SC = window.FairyShoeScene;
const CH = C.CHARACTERS;
const SAVE_KEY = 'fairyshoe.v1';
const DEFAULT_TITLE = 'Ma\'am';
const TITLE_CHIPS = ['Ma\'am', 'Sir', 'Matron', 'Keeper', 'Miss', 'Mister'];
const COLOURS = { red: '#b02828', goldilocks: '#b8922f', rapunzel: '#7e6bb0', jack: '#4a7d38', hans: '#7d7c6c', snow: '#2f4d9c' };

const app = { g: null, rng: Math.random, title: DEFAULT_TITLE, keeper: 'a', settings: { guidance: true, sound: true }, selected: null, expanded: {}, stage: null, live: null, advance: null };

// ── Helpers ─────────────────────────────────────────────────────
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v;
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; e.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return e;
}
const $ = s => document.querySelector(s);
const fmt = s => String(s).replace(/\{Title\}/g, app.title);
const cap = s => s[0].toUpperCase() + s.slice(1);
function pips(n, cls) { const e = h('span', { class: 'pips ' + (cls || '') }); for (let i = 1; i <= 7; i++) e.append(h('i', { class: i <= n ? 'f' : '' })); return e; }
const delay = ms => new Promise(r => setTimeout(r, ms));
function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage may be blocked */ } }
function recall(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }

function save() { if (app.g) store(SAVE_KEY, { g: app.g, title: app.title, keeper: app.keeper, settings: app.settings }); }
function saveSettings() { store(SAVE_KEY + '.prefs', { title: app.title, keeper: app.keeper, settings: app.settings }); }

function setScreen(node) { const a = $('#app'); a.replaceChildren(node); window.scrollTo(0, 0); }
function showStage(on) { $('#stage').classList.toggle('on', on); if (on && app.stage) app.stage.resize(); }
function say(id, text) { const s = $('#speech'); if (!text) { s.hidden = true; return; } s.replaceChildren(h('b', {}, CH[id].name), fmt(text)); s.hidden = false; }
async function busy(text, fn) {
  $('#loading-text').textContent = text; $('#loading').hidden = false;
  await delay(40);
  try { return await fn(); } finally { $('#loading').hidden = true; }
}
function modal(...kids) { const o = $('#overlay'); o.replaceChildren(h('div', { class: 'card' }, kids)); o.hidden = false; o.onclick = e => { if (e.target === o && o.dataset.dismiss !== 'no') closeModal(); }; }
function closeModal() { const o = $('#overlay'); o.hidden = true; o.replaceChildren(); delete o.dataset.dismiss; }

function header(extra) {
  const g = app.g;
  return h('div', { class: 'bar' },
    h('h1', {}, 'The Fairy Shoe'), h('span', { class: 'day' }, g.day ? 'Day ' + g.day : ''),
    h('span', { class: 'grow' }), extra || null,
    h('button', { class: 'quiet', onclick: showCollection }, 'Collection (' + g.collection.length + '/' + C.ORDER.length + ')'),
    h('button', { class: 'quiet', onclick: showRules }, 'How it works'),
    h('button', { class: 'quiet', title: 'Show the band each resident needs on the meter', onclick: () => { app.settings.guidance = !app.settings.guidance; saveSettings(); refreshGuidance(); } }, 'Guidance: ' + (app.settings.guidance ? 'on' : 'off')),
    h('button', { class: 'quiet', onclick: () => { app.settings.sound = !app.settings.sound; SC.Sound.set(app.settings.sound); saveSettings(); setSoundLabel(); }, id: 'soundbtn' }, 'Sound: ' + (app.settings.sound ? 'on' : 'off')),
    h('button', { class: 'quiet', onclick: leaveToMenu }, 'Menu'));
}
function setSoundLabel() { const b = $('#soundbtn'); if (b) b.textContent = 'Sound: ' + (app.settings.sound ? 'on' : 'off'); }
function refreshGuidance() { if (app.refreshGuidance) app.refreshGuidance(); document.querySelectorAll('.bar button').forEach(b => { if (/^Guidance/.test(b.textContent)) b.textContent = 'Guidance: ' + (app.settings.guidance ? 'on' : 'off'); }); }
function candle() { const g = app.g, e = h('span', { class: 'candle', title: 'Marks to spend on a reprieve or aftercare this evening' }, 'Candle '); for (let i = 0; i < R.EVENING_CANDLE; i++) e.append(h('i', { class: i < g.candle ? 'lit' : '' })); return e; }

// ── Intro ───────────────────────────────────────────────────────
function showIntro() {
  closeModal(); showStage(false); say(null, null);
  const prefs = recall(SAVE_KEY + '.prefs'); if (prefs) { app.title = prefs.title || app.title; app.keeper = prefs.keeper || app.keeper; app.settings = { ...app.settings, ...(prefs.settings || {}) }; }
  SC.Sound.set(app.settings.sound);
  const saved = recall(SAVE_KEY);
  const input = h('input', { type: 'text', maxlength: 24, value: app.title, 'aria-label': 'What the residents call you', oninput: e => { app.title = e.target.value.trim().slice(0, 24) || DEFAULT_TITLE; } });
  const chips = h('div', { class: 'chips' }, TITLE_CHIPS.map(t => h('button', { onclick: () => { input.value = t; app.title = t; } }, t)));
  const keepers = h('div', { class: 'keepers' }), paint = () => keepers.replaceChildren(...Object.entries(B.KEEPERS).map(([k, v]) => h('button', { class: app.keeper === k ? 'on' : '', onclick: () => { app.keeper = k; paint(); } }, v.label)));
  paint();
  setScreen(h('div', { class: 'screen wash' }, h('div', { class: 'intro' },
    h('h1', {}, 'The Fairy Shoe'),
    h('p', { class: 'lede' }, 'A halfway house, and you run it. The people who find their way to your door are the ones the stories left behind: characters whose tales ended without a moral, or who never lived the one we know them for. Now they are grown, and the strict adult world has no room for them. They come here to be set straight, and you are the one who does it, by hand, in your own time.'),
    h('div', { class: 'panel consent' }, h('h3', {}, 'The house rules, before anything else'),
      h('p', {}, h('b', {}, 'Everyone here is an adult. '), 'Every resident is over eighteen, arrived of their own accord, and understood what the house is and what happens in it before they came in.'),
      h('p', {}, h('b', {}, 'The word. '), 'Anyone can use the word at any moment. When they do, it stops, they leave, and the house starts over with someone new. The game never overrules it, and neither should you.')),
    h('div', { class: 'panel' }, h('h3', {}, 'What should they call you?'),
      h('p', {}, 'You are never named in the house. The residents will say whatever you choose here.'), input, chips),
    h('div', { class: 'panel' }, h('h3', {}, 'Your hands'), h('p', {}, 'Who you appear as in the room.'), keepers),
    h('div', { class: 'row' },
      h('button', { class: 'primary', onclick: () => { saveSettings(); startNew(); } }, 'Open the door'),
      saved ? h('button', { onclick: () => { saveSettings(); continueGame(saved); } }, 'Continue (Day ' + saved.g.day + ')') : null))));
}
function leaveToMenu() { teardownLive(); save(); showIntro(); }

// ── Starting and resuming ───────────────────────────────────────
function seed() { return R.mulberry32((Date.now() ^ (Math.random() * 4294967296)) >>> 0); }
async function ensureStage() {
  if (app.stage) return app.stage;
  app.stage = SC.createStage($('#stage'), { onGLProblem: msg => { const b = $('#glbanner'); b.textContent = msg; b.hidden = false; b.onclick = () => { b.hidden = true; }; } });
  return app.stage;
}
function startNew() {
  app.rng = seed(); app.g = R.newGame(app.rng, { title: app.title });
  const first = app.g.roster.map(id => ({ type: 'arrive', id }));
  showNotices('The first morning', first, () => { nextDay(); if (!recall('fairyshoe.seenrules')) { store('fairyshoe.seenrules', 1); showRules(); } }, 'Begin');
}
function continueGame(saved) {
  app.rng = seed(); app.g = saved.g; app.title = saved.title; app.keeper = saved.keeper || 'a'; app.settings = { ...app.settings, ...(saved.settings || {}) };
  app.g.title = app.title; app.selected = null; renderMorning();
}
function nextDay() {
  if (app.stage) app.stage.clearMarks();
  R.startMorning(app.g, app.rng); app.g.title = app.title; app.selected = null; app.expanded = {};
  save(); renderMorning();
}

// ── Notices (arrivals, moving on, the word) ─────────────────────
function noticeCard(n) {
  const d = CH[n.id];
  if (n.type === 'arrive') return h('div', { class: 'notice' }, h('h3', {}, d.name + ', ' + d.age), h('p', {}, h('i', {}, d.tagline)), h('p', {}, d.story), h('p', { class: 'say' }, fmt(d.lines.arrive)));
  if (n.type === 'moveon') return h('div', { class: 'notice' }, h('h3', {}, d.name + ' has moved on'), h('p', { class: 'say' }, fmt(d.lines.leave)), h('p', {}, 'They are in your Collection now, for good. The house will take in someone new.'));
  return h('div', { class: 'notice word' }, h('h3', {}, d.name + ' used the word'), h('p', { class: 'say' }, fmt(C.SAYINGS.word[0])), h('p', {}, 'It stopped, as it should. ' + d.name + ' has packed up and gone, with nothing held against them, and starts again, fresh, if the house is ever theirs again.'));
}
function showNotices(title, notices, then, label) {
  const o = $('#overlay'); o.dataset.dismiss = 'no';
  modal(h('h2', {}, title), notices.map(noticeCard), h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'primary', onclick: () => { closeModal(); then(); } }, label || 'Continue')));
}

// ── Cards for people ────────────────────────────────────────────
function statsBlock(id) {
  const s = app.g.chars[id].stats, g = app.g;
  const rows = []; for (const k of C.STATS) rows.push(h('span', { class: 'k', title: C.STAT_HINTS[k] }, C.STAT_NAMES[k]), pips(s[k], k === 'wil' || k === 'res' ? 'hot' : ''));
  return h('div', { class: 'stats' }, rows);
}
function effLine(id) {
  const e = R.effectiveAttention(app.g.chars[id].stats);
  return 'At chores: ' + e.value + (e.mod ? ' (' + (e.mod > 0 ? '+' : '−') + Math.abs(e.mod) + ' from state)' : '');
}
function residentCard(id, opts = {}) {
  const d = CH[id], g = app.g, open = !!app.expanded[id];
  const card = h('div', { class: 'res' + (app.selected === id ? ' sel' : '') + (opts.placed ? ' placed' : ''), draggable: !!opts.draggable, 'data-id': id },
    h('button', { class: 'flip', onclick: e => { e.stopPropagation(); app.expanded[id] = !open; opts.rerender && opts.rerender(); } }, open ? 'close' : 'story'),
    h('div', { class: 'head' }, h('div', { class: 'mono', style: 'background:' + COLOURS[id] }, d.name[0]),
      h('div', {}, h('div', { class: 'nm' }, d.name + ', ' + d.age), h('div', { class: 'sub' }, d.tagline))),
    statsBlock(id), h('div', { class: 'eff' }, effLine(id)),
    open ? h('div', { class: 'story' }, d.story, g.collection.includes(id) ? h('div', { style: 'margin-top:6px' }, h('b', {}, 'What you learned: '), d.note) : null) : null);
  if (opts.onclick) card.addEventListener('click', opts.onclick);
  if (opts.draggable) { card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; app.selected = id; }); }
  return card;
}

// ── Morning ─────────────────────────────────────────────────────
function renderMorning() {
  teardownLive(); closeModal(); showStage(false); say(null, null);
  const g = app.g, ready = R.allAssigned(g);
  const rerender = () => renderMorning();
  const place = (ci, si, id) => { R.assign(g, ci, si, id); app.selected = null; renderMorning(); };
  const residents = g.roster.map(id => residentCard(id, {
    draggable: true, placed: !!R.choreOf(g, id), rerender,
    onclick: () => { app.selected = app.selected === id ? null : id; renderMorning(); },
  }));
  const chores = g.chores.map((ch, ci) => h('div', { class: 'chore' },
    h('div', { class: 't' }, h('span', { class: 'nm' }, ch.def.name), h('span', { class: 'diff', title: 'Difficulty' }, '●'.repeat(ch.def.diff) + '○'.repeat(3 - ch.def.diff))),
    ch.def.paired ? h('span', { class: 'tag' }, 'two hands, and how well they get on') : null,
    h('div', { class: 'slots' }, ch.slots.map((who, si) => {
      const slot = h('div', { class: 'slot' + (who ? ' full' : ''), onclick: () => {
        if (who && !app.selected) { R.unassign(g, who); renderMorning(); }
        else if (app.selected) place(ci, si, app.selected);
      } }, who ? [CH[who].name, h('span', { class: 'x' }, '✕')] : (ch.def.paired ? 'Resident ' + (si + 1) : 'Assign a resident'));
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('over'));
      slot.addEventListener('drop', e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) place(ci, si, id); });
      return slot;
    }))));
  setScreen(h('div', { class: 'screen' }, header(),
    h('div', { class: 'morning' },
      h('div', { class: 'col' }, h('h2', {}, 'Morning: the house'), h('div', { class: 'hint' }, 'Tap a resident, then a chore, or drag one across. The “story” tab opens their file. At chores is how well their state lets them work today.'), residents),
      h('div', { class: 'col' }, h('h2', {}, 'Today\'s list'), h('div', { class: 'hint' }, 'The day starts once everyone has something to do. Tap a placed name to take it back.'), chores,
        ready ? h('div', { class: 'starting' }, 'The day begins…') : null))));
  if (ready) { const day = g.day; app.advance = setTimeout(() => { if (app.g === g && g.day === day && g.phase === 'assign' && R.allAssigned(g)) beginDay(); }, 1100); }
  else clearTimeout(app.advance);
}
function beginDay() {
  const g = app.g, out = R.resolveDay(g, app.rng);
  const notices = out.notices;
  if (notices.length) showNotices('Over the day', notices, renderEvening, 'On to the evening');
  else renderEvening();
}

// ── Evening ─────────────────────────────────────────────────────
const SEVERITY_BAND_NOTE = ['Minimal', 'Light', 'Moderate', 'Firm', 'Severe'];
function queueBar(current) {
  const g = app.g;
  return h('div', { class: 'queue' }, g.cards.map(c => h('span', { class: (c.id === current ? 'cur ' : '') + (c.done ? 'done' : '') }, CH[c.id].name)));
}
function renderEvening() {
  teardownLive(); closeModal(); showStage(false); say(null, null);
  const g = app.g, pending = R.pendingCards(g);
  if (!pending.length) return endNight();
  const card = pending[0], id = card.id, d = CH[id];
  const ev = card.event, trouble = card.band === 'partial' || card.band === 'failed';
  const words = h('div', { class: 'words', hidden: true }, Object.entries(C.REPRIEVES).map(([k, r]) => h('button', { class: 'choice paper', disabled: g.candle < r.cost, onclick: () => doReprieve(card, k) },
    h('b', {}, r.name, h('span', { class: 'costtag' }, '● '.repeat(r.cost).trim())), h('span', {}, r.blurb))));
  setScreen(h('div', { class: 'screen' }, header(candle()),
    h('div', { class: 'evening' },
      h('div', {}, queueBar(id),
        h('div', { class: 'behave' }, h('span', { class: 'lab' }, 'Behaviour card'), h('h2', {}, d.name + ', ' + d.age), h('div', { class: 'small' }, card.choreName + (card.band === 'well' ? ': done beautifully' : card.band === 'completed' ? ': done' : card.band === 'partial' ? ': half done' : ': not done')),
          h('div', { class: 'ln ' + (card.band === 'well' ? 'well' : trouble ? 'trouble' : '') }, h('span', { class: 'lab' }, 'The day\'s work'), card.choreLine),
          ev ? h('div', { class: 'ln event' }, h('span', { class: 'lab' }, C.CATEGORIES[ev.cat].label), ev.text) : null),
        h('div', { class: 'choices' },
          h('button', { class: 'choice', onclick: () => renderSetup(card) }, h('b', {}, 'Sit ' + d.name + ' down'), h('span', {}, 'A live correction. How it goes, and when it ends, is entirely up to you.')),
          h('button', { class: 'choice', onclick: () => { words.hidden = !words.hidden; } }, h('b', {}, 'Offer a word instead'), h('span', {}, 'A reprieve replaces the correction. It costs candle, and the trouble goes unanswered by hand.')),
          words)),
      h('div', {}, residentCard(id, { rerender: renderEvening })))));
}
function doReprieve(card, kind) {
  const g = app.g, snap = R.applyReprieve(g, card.id, kind);
  if (!snap) return;
  save();
  showResult(snap, { stage: false });
}

// ── Setting up the correction ───────────────────────────────────
function renderSetup(card) {
  const id = card.id, d = CH[id];
  const set = app.setup && app.setup.id === id ? app.setup : (app.setup = { id, position: 'case', clothing: 'bottoms', implement: 'hand' });
  const dock = h('div', { class: 'dock' });
  const paint = () => {
    const tabs = (items, key, onPick) => h('div', { class: 'tabs' }, items.map(([v, l]) => h('button', { class: set[key] === v ? 'on' : '', disabled: key === 'implement' && set.position === 'spread' && !window.Starlight.IMPLEMENTS[v].dual, onclick: () => { set[key] = v; if (key === 'position' && v === 'spread' && !window.Starlight.IMPLEMENTS[set.implement].dual) set.implement = 'paddle'; paint(); } }, l)));
    dock.replaceChildren(h('h2', {}, d.name), h('div', { class: 'sub' }, 'You decide the position, what they wear for it and what you use. Once you begin you cannot change position or clothing; the rest you can change as you go.'),
      h('h4', {}, 'Position'), tabs(SC.POSITIONS, 'position'), h('h4', {}, 'Clothing'), tabs(SC.CLOTHING, 'clothing'), h('h4', {}, 'To begin with'), tabs(SC.IMPLEMENTS, 'implement'),
      h('div', { class: 'word' }, h('b', {}, 'The word '), 'is always honoured. If ' + d.name + ' calls it, or is brought too far, it stops.'),
      h('button', { class: 'primary big', onclick: () => startLive(card, set) }, 'Bring them in'),
      h('button', { class: 'quiet big', onclick: () => { dock.remove(); } }, 'Back'));
  };
  paint(); document.querySelectorAll('#app .dock').forEach(x => x.remove()); $('#app').append(dock);
}

// ── The live correction ─────────────────────────────────────────
function teardownLive() {
  clearTimeout(app.advance);
  if (app.live) { try { app.live.onChange = null; app.live.onImpact = null; } catch (e) { /* */ } }
  if (app.stage && app.stage.session) app.stage.end();
  app.live = null; app.refreshGuidance = null; document.removeEventListener('keydown', onKey);
}
function onKey(e) {
  const s = app.live; if (!s || e.target.tagName === 'INPUT' || e.code !== 'Space') return;
  e.preventDefault(); if (s.st.raised) s.strikeNow(); else s.smack();
}
async function startLive(card, set) {
  const id = card.id, g = app.g, d = CH[id];
  await busy('Setting the room…', async () => {
    const stage = await ensureStage();
    showStage(true); setScreen(h('div'));
    app.live = stage.begin({ giver: B.keeper(app.keeper), subject: B.spec(id), subjectId: id, position: set.position, implement: set.implement, clothing: set.clothing, pain: { ...d.pain } });
  });
  const ses = app.live; SC.Sound.set(app.settings.sound);
  say(id, C.CHARACTERS[id].lines.open[Math.floor(app.rng() * d.lines.open.length)]);
  ses.card = card; ses.setup = set;
  buildLiveDock(ses, card, set);
  document.addEventListener('keydown', onKey);
}
function buildLiveDock(ses, card, set) {
  const id = card.id, d = CH[id], g = app.g, P = ses.pain;
  const posName = SC.POSITIONS.find(p => p[0] === set.position)[1], clothName = SC.CLOTHING.find(p => p[0] === set.clothing)[1];
  const expected = R.expectedBand(g.chars[id].stats, card), cuts = R.BAND_CUTS, SCALE = 1.5;
  const lo = expected === 0 ? 0 : cuts[expected - 1], hi = cuts[expected];
  const fill = h('div', { class: 'fill' }), aim = h('div', { class: 'aim', style: 'left:' + (lo / SCALE * 100) + '%;width:' + ((hi - lo) / SCALE * 100) + '%' });
  const meter = h('div', { class: 'meter' }, aim, fill, h('div', { class: 'edge', title: 'The edge of resistance' }));
  const reading = h('div', { class: 'reading' }), aimText = h('small', {});
  app.refreshGuidance = () => { aim.hidden = !app.settings.guidance; aimText.textContent = app.settings.guidance ? 'You are aiming for: ' + R.BANDS[expected] + ' (shaded). The white tick is the edge of resistance.' : ''; };
  app.refreshGuidance();

  const tabs = h('div', { class: 'tabs' }, SC.IMPLEMENTS.map(([v, l]) => h('button', { 'data-v': v, onclick: () => { ses.setImplement(v); sync(); } }, l)));
  const sev = h('div', { class: 'tabs' }, SC.SEVERITY.map((v, i) => h('button', { 'data-v': i, onclick: () => { ses.setSeverity(i); st.runLen = v.count; sync(); } }, v.name)));
  const st = { runLen: SC.SEVERITY[ses.severityIndex].count };
  const slider = (label, key, min, max, step, fmtv) => {
    const val = h('span', {}, ''), inp = h('input', { type: 'range', min, max, step, value: ses.st.strike[key] });
    inp.oninput = () => { ses.setStrike(key, +inp.value); val.textContent = fmtv(+inp.value); };
    inp.dataset.key = key; val.textContent = fmtv(ses.st.strike[key]);
    return { el: h('div', { class: 'sl' }, h('label', {}, h('span', {}, label), val), inp), inp, val, key, fmtv };
  };
  const sliders = [slider('Speed of the swing', 'speed', 0.5, 2, 0.05, v => v.toFixed(2) + '×'), slider('Hold before the swing', 'hold', 0, 3, 0.05, v => v.toFixed(2) + ' s'), slider('Hold after contact', 'dwell', 0, 3, 0.05, v => v.toFixed(2) + ' s')];
  const runInp = h('input', { type: 'range', min: 1, max: 200, step: 1, value: st.runLen }), runVal = h('span', {}, st.runLen);
  runInp.oninput = () => { st.runLen = +runInp.value; runVal.textContent = st.runLen; };
  const smack = h('button', { onclick: () => ses.smack() }, 'Smack'), raise = h('button', { onclick: () => { if (ses.st.raised) ses.strikeNow(); else ses.raise(); } }, 'Raise');
  const run = h('button', { onclick: () => { if (ses.running) ses.stop(); else ses.run(st.runLen); } }, 'Run');
  const lower = h('button', { class: 'quiet', onclick: () => ses.lower() }, 'Lower the arm');
  const info = h('div', { class: 'sub' }), end = h('button', { class: 'primary big', onclick: () => finishLive(ses, card) }, 'End the correction');
  const dock = h('div', { class: 'dock' },
    h('h2', {}, d.name), h('div', { class: 'sub' }, posName + ' · ' + clothName), h('h4', {}, 'How they are'), reading, meter, aimText,
    h('h4', {}, 'What you use'), tabs, h('h4', {}, 'How hard'), sev, ...sliders.map(s => s.el),
    h('h4', {}, 'Your hand'), h('div', { class: 'pair' }, smack, raise), h('div', { class: 'pair' }, run, lower),
    h('div', { class: 'sl' }, h('label', {}, h('span', {}, 'Smacks in a run'), runVal), runInp), info,
    h('div', { class: 'word' }, h('b', {}, 'The word '), 'is always honoured. ', 'Space smacks, or strikes if the arm is raised.'), end);
  setScreen(dock);

  const sync = () => {
    tabs.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.v === ses.implement); b.disabled = set.position === 'spread' && !window.Starlight.IMPLEMENTS[b.dataset.v].dual; });
    sev.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === ses.severityIndex));
    sliders.forEach(s => { s.inp.value = ses.st.strike[s.key]; s.val.textContent = s.fmtv(ses.st.strike[s.key]); });
    runInp.value = st.runLen; runVal.textContent = st.runLen;
  };
  sync();
  let spoke = false, last = 0;
  ses.onChange = () => {
    const now = performance.now(); if (now - last < 80) return; last = now;
    const dist = ses.distress();
    fill.style.width = Math.min(100, dist / SCALE * 100) + '%';
    fill.style.background = dist < 0.3 ? '#6b9e5a' : dist < 0.6 ? '#b4a24a' : dist < 0.9 ? '#c8803c' : dist < 1 ? '#c24a3a' : dist < 1.5 ? '#b08ad0' : '#7a1f1f';
    reading.replaceChildren(cap(ses.band()), h('small', {}, ses.st.smacks + (ses.st.smacks === 1 ? ' smack' : ' smacks')));
    const can = ses.canStrike();
    smack.disabled = !can || ses.st.raised || ses.running;
    raise.textContent = ses.st.raised ? 'Strike now' : 'Raise'; raise.disabled = ses.running || (ses.st.raised ? ses.busy : !can);
    run.textContent = ses.running ? 'Stop' : 'Run ' + st.runLen; run.disabled = !can && !ses.running;
    lower.disabled = ses.running;
    // Past the point of no return they stop: nothing further is struck.
    if (ses.st.tooHarsh && !spoke) { spoke = true; info.textContent = d.name + ' has been brought too far. Nothing more will be struck.'; say(id, C.SAYINGS.harsh[0]); end.textContent = 'End it'; }
    // Position and clothing are fixed once you begin (they would need the room rebuilt).
  };
  ses.onChange(ses);
}
function finishLive(ses, card) {
  const g = app.g, id = card.id;
  const done = ses.finish();
  const snap = R.applyCorrection(g, id, done);
  document.removeEventListener('keydown', onKey);
  save();
  // keep the room and the bodies on screen behind the result
  say(id, snap.word ? C.SAYINGS.word[0] : snap.quality === 'well' ? C.SAYINGS.well[Math.floor(app.rng() * C.SAYINGS.well.length)] : snap.quality.startsWith('under') ? (snap.smacks ? C.SAYINGS.under[Math.floor(app.rng() * 3)] : C.SAYINGS.nothing[0]) : snap.tooHarsh ? C.SAYINGS.harsh[0] : C.SAYINGS.over[Math.floor(app.rng() * 3)]);
  showResult(snap, { stage: true });
}

// ── Results and aftercare ───────────────────────────────────────
function chipsFor(changes) {
  if (!changes.length) return h('div', { class: 'chg' }, h('span', {}, 'No change in how they are'));
  return h('div', { class: 'chg' }, changes.map(c => {
    const up = c.to > c.from, goodUp = !(c.stat === 'wil' || c.stat === 'res');
    return h('span', { class: (up === goodUp) ? 'up' : 'down' }, C.STAT_NAMES[c.stat] + ' ' + (up ? '▲ ' : '▼ ') + c.from + ' → ' + c.to);
  }));
}
function exitsBlock(exits) {
  return exits.map(n => h('div', { class: 'exit' + (n.type === 'word' ? ' word' : '') },
    n.type === 'word' ? CH[n.id].name + ' used the word. ' + fmt(C.SAYINGS.word[0]) + ' It stopped at once, and they are gone from the house.' : CH[n.id].name + ' has moved on. ' + fmt(CH[n.id].lines.leave)));
}
function showResult(snap, { stage }) {
  const g = app.g, id = snap.id, d = CH[id];
  const wrap = h('div', { class: 'resultwrap' + (stage ? ' side' : '') });
  const body = h('div', { class: 'result' });
  const draw = () => {
    const here = g.roster.includes(id), canAfter = snap.kind === 'correction' && here && !snap.word;
    body.replaceChildren(...[
      h('h2', {}, snap.kind === 'reprieve' ? d.name + ': ' + snap.name : d.name),
      snap.kind === 'correction' ? [
        h('div', { class: 'verdict' }, snap.smacks ? snap.smacks + (snap.smacks === 1 ? ' smack. ' : ' smacks. ') : 'You decided that was enough without lifting a hand. ',
          snap.tooHarsh ? ['You took them past what they could bear; they needed ', h('b', {}, snap.expectedName), '.']
            : ['You brought them to ', h('b', {}, snap.reachedName), '; they needed ', h('b', {}, snap.expectedName), '.']),
        h('div', {}, snap.text + '.')] : null,
      snap.word ? null : chipsFor(snap.changes), exitsBlock(snap.exits),
      canAfter ? [h('h4', {}, 'Afterwards'), h('div', { class: 'choices' }, Object.entries(C.AFTERCARE).filter(([k]) => !(snap.done || (snap.done = {}))[k]).map(([k, a]) =>
        h('button', { class: 'choice paper', disabled: g.candle < a.cost, onclick: () => { const r = R.applyAftercare(g, id, k); if (!r) return; snap.done[k] = true; snap.changes = snap.changes.concat(r.changes); snap.exits = snap.exits.concat(r.exits); save(); draw(); } },
          h('b', {}, a.name, h('span', { class: 'costtag' }, '● '.repeat(a.cost).trim())), h('span', {}, a.blurb))))] : null,
      h('div', { class: 'row', style: 'margin-top:14px' }, candle(), h('span', { class: 'grow' }), h('button', { class: 'primary', onclick: () => { wrap.remove(); teardownLive(); showStage(false); say(null, null); save(); renderEvening(); } }, 'Next'))].flat(Infinity).filter(Boolean));
  };
  draw(); wrap.append(body);
  if (!stage) { const s = h('div', { class: 'screen' }, header(candle()), wrap); setScreen(s); } else $('#app').append(wrap);
  // the dock is replaced by the result when the room is on screen
  if (stage) { const dock = $('#app .dock'); if (dock) dock.remove(); }
}

// ── The end of the night ────────────────────────────────────────
function endNight() {
  const g = app.g, notices = R.endEvening(g, app.rng);
  if (notices.length) showNotices('Overnight', notices, nextDay, 'Morning');
  else nextDay();
}

// ── Collection and rules ────────────────────────────────────────
function showCollection() {
  const g = app.g;
  modal(h('h2', {}, 'Collection'), h('p', { style: 'color:var(--muted)' }, 'Everyone who has moved on stays here for good, however many times the house takes them in again.'),
    h('div', { class: 'coll' }, C.ORDER.map(id => {
      const d = CH[id], got = g.collection.includes(id);
      return got ? h('div', { class: 'slotc got' }, h('h3', {}, d.name), h('p', {}, h('i', {}, d.tagline)), h('p', {}, fmt(d.lines.leave)), h('p', {}, h('b', {}, 'What you learned: '), d.note))
        : h('div', { class: 'slotc' }, h('h3', {}, '???'), h('p', {}, 'Not yet moved on.'));
    })),
    h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { onclick: closeModal }, 'Close')));
}
function showRules() {
  modal(h('h2', {}, 'How the house works'), h('div', { class: 'rules' },
    h('h3', {}, 'The day'),
    h('p', {}, 'Each morning there is a fresh list of chores, one place for each resident. Send people where their state lets them do well; the work quietly feeds back into how they are. Then each evening you see every resident in turn: what they did, and what happened.'),
    h('h3', {}, 'Six measures'),
    h('ul', {}, h('li', {}, 'Wilfulness and Resentment are the trouble. Satisfaction, Valued and Composure are what holds a person steady. Attention is how well they work.'), h('li', {}, 'Low Valued makes a correction read as punishment. Resentment at the top with Valued at the bottom is when someone uses the word.')),
    h('h3', {}, 'The correction is yours'),
    h('p', {}, 'You choose the position, the clothing and the implement, then everything else is live: raise, strike, run a few, wait, stop. The meter shows how far you have brought them; the white tick is their edge of resistance. A resident needs a different amount depending on their Wilfulness and on what happened that day: more for a bold or troublesome one, more again after a bad day or a bad event. Too little does not land; too much costs trust. A few kinds of trouble are better met with a kind word than a hand.'),
    h('p', {}, 'The highest distress you bring them to counts, not where they end up. Stop at the right moment. Beyond too harsh, nothing more is struck, and a resident whose trust is thin will use the word.'),
    h('h3', {}, 'Candle'),
    h('p', {}, 'Corrections cost nothing, but aftercare (corner time, lines, held after, warm words) and reprieves (a stern, kind or written word) are paid from the evening\'s candle, and there is never enough for everything.'),
    h('h3', {}, 'Moving on, and the word'),
    h('p', {}, 'When someone has settled enough, they move on, and you will not be told it is coming. Anyone may use the word at any time; it ends things at once, and they start again from the beginning when and if the house takes them in. Everyone here is an adult who chose to come.')),
    h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'primary', onclick: closeModal }, 'Close')));
}

window.__fs = { app, R, C, B, SC, renderMorning, renderEvening, showIntro };
window.addEventListener('DOMContentLoaded', showIntro);
if (document.readyState !== 'loading') showIntro();
})();
