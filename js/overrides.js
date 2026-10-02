// The Fairy Shoe — overrides: edits to the characters' designs and to the discipline scene's poses, kept in localStorage and
// applied by bodies.js (designs) and scene.js (poses). The editor page (editor.html) writes them; the game only reads them.
// Pure logic and storage, no three.js, so it also runs in Node for the tests.
(function (root) {
'use strict';
const KEY = 'fairyshoe.overrides.v1';
const BONE_RE = /^[A-Za-z0-9]+$/;
const BEATS = { relaxed: 'relaxed', 'arm raised': 'raised', raised: 'raised', contact: 'contact' };
const POSITIONS = ['lap', 'case', 'head', 'chair', 'spread'];

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
// Objects merge key by key; arrays and scalars replace. `null` deletes a key.
function deepMerge(base, patch) {
  if (!isObj(base) || !isObj(patch)) return patch;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : (isObj(v) ? deepMerge({}, v) : (Array.isArray(v) ? v.slice() : v));
  }
  return out;
}

function empty() { return { designs: {}, poses: [] }; }
let mem = empty();
function load() {
  try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && isObj(o.designs) && Array.isArray(o.poses)) mem = o; } catch (e) { /* none saved, or storage blocked */ }
  return mem;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* storage may be blocked */ } }
const get = () => mem;
function set(o) { mem = { designs: o.designs || {}, poses: o.poses || [] }; save(); }

// ── Designs ─────────────────────────────────────────────────────
// Accepts a JSON object: either a few fields of a preset ({"height":170,"outfit":{"hair":9449516}}) or a whole preset as the
// character viewer's “Show JSON” prints it. Hex colours may be written as numbers or as "0xrrggbb" / "#rrggbb" strings.
function parseJSONLoose(text) {
  const t = String(text).trim();
  if (!t) throw new Error('Nothing to read.');
  const from = t.indexOf('{'), to = t.lastIndexOf('}');
  if (from < 0 || to < from) throw new Error('Expected a JSON object, starting with {.');
  // tolerate trailing commas and unquoted hex like 0xe9c6a5, which a pasted JS literal would have
  const cleaned = t.slice(from, to + 1).replace(/,(\s*[}\]])/g, '$1').replace(/:\s*(0x[0-9a-fA-F]+)/g, (m, h) => ': ' + parseInt(h, 16));
  return JSON.parse(cleaned);
}
function normaliseColours(v) {
  if (typeof v === 'string' && /^(#|0x)[0-9a-fA-F]{6}$/.test(v)) return parseInt(v.replace('#', '').replace(/^0x/, ''), 16);
  if (Array.isArray(v)) return v.map(normaliseColours);
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normaliseColours(x)]));
  return v;
}
function parseDesign(text) {
  const o = parseJSONLoose(text);
  if (!isObj(o)) throw new Error('Expected an object.');
  return normaliseColours(o);
}
function designFor(id) { return mem.designs[id] || null; }
function applyDesign(spec, id) { const p = designFor(id); return p ? deepMerge(spec, p) : spec; }
function setDesign(id, patch, { replace = false } = {}) { mem.designs[id] = replace || !mem.designs[id] ? patch : deepMerge(mem.designs[id], patch); save(); }
function clearDesign(id) { delete mem.designs[id]; save(); }

// ── Poses ───────────────────────────────────────────────────────
// An entry says: in this position, for the subject or the disciplinarian, at this beat, these bones take these local Euler
// angles (degrees [x, y, z], order YXZ, the engine's pose-table convention). For the subject, beat 'base' is the resting pose
// and 'contact' what it blends toward when struck; for the disciplinarian the beats are relaxed / raised / contact.
function checkBones(bones) {
  const out = {};
  for (const [b, e] of Object.entries(bones || {})) {
    if (!BONE_RE.test(b)) throw new Error('Odd bone name: ' + b);
    if (!Array.isArray(e) || e.length !== 3 || e.some(x => typeof x !== 'number' || !isFinite(x))) throw new Error(b + ' needs three numbers [x, y, z].');
    out[b] = e.map(x => Math.round(x * 100) / 100);
  }
  return out;
}
function entry(position, who, beat, bones, label) {
  if (!POSITIONS.includes(position)) throw new Error('Unknown position: ' + position);
  if (who !== 'subject' && who !== 'giver') throw new Error('who must be "subject" or "giver".');
  const b = who === 'subject' ? (beat === 'contact' ? 'contact' : 'base') : (BEATS[String(beat).toLowerCase()] || null);
  if (!b) throw new Error('Unknown beat: ' + beat);
  return { position, who, beat: b, bones: checkBones(bones), label: label || '' };
}
const nums = s => s.split(',').map(x => parseFloat(x));
// The viewer's pose-editor report. Each section is
//   == Arm raised · Hairbrush ==
//   [Over the case. ]Disciplinarian X, subject Y, palm angle N%.
//   Disciplinarian:  /  Subject:
//     bone: [x, y, z] → [x, y, z], turned …; local Δ […]; table [x, y, z] (the scene changes it)   or   … scene = table
// Where the scene changes a bone (IK), the pose table's own value is the one to keep; otherwise the edited value.
function parseReport(text, defaultPosition) {
  const out = [], warn = [];
  let sec = null, who = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    let m = /^==\s*(.+?)\s*==\s*$/.exec(line);
    if (m) {
      const [label] = m[1].split('·'); const lab = label.replace(/\((left|right|both sides)\)/i, '').trim().toLowerCase();
      sec = { beat: BEATS[lab] || null, label: m[1], position: defaultPosition || 'lap', bones: { subject: {}, giver: {} } }; who = null;
      if (!sec.beat) warn.push('Skipped a section with an unknown beat: ' + m[1]);
      out.push(sec); continue;
    }
    if (!sec) continue;
    if (/Over the case\./.test(line)) { if (!defaultPosition) sec.position = 'case'; continue; }
    if (/^Disciplinarian:\s*$/.test(line)) { who = 'giver'; continue; }
    if (/^Subject:\s*$/.test(line)) { who = 'subject'; continue; }
    m = /^\s+(\w+):\s*\[([^\]]+)\]\s*→\s*\[([^\]]+)\]/.exec(line);
    if (m && who) {
      const tab = /table\s*\[([^\]]+)\]/.exec(line), v = nums(tab ? tab[1] : m[3]);
      if (v.length === 3 && v.every(isFinite)) sec.bones[who][m[1]] = v;
    }
  }
  const entries = [];
  for (const s of out) {
    if (!s.beat) continue;
    for (const w of ['giver', 'subject']) {
      if (!Object.keys(s.bones[w]).length) continue;
      // the subject's edits at a relaxed or raised beat are its base pose; at contact, the struck pose
      const beat = w === 'subject' ? (s.beat === 'contact' ? 'contact' : 'base') : s.beat;
      entries.push(entry(s.position, w, beat, s.bones[w], s.label));
    }
  }
  return { entries, warn };
}
// JSON: an entry, an array of entries, or {position, who, beat, bones}. (Also {"subject": {...bones}, "giver": {...}, "beat":…}.)
function parsePoseJSON(text, defaults = {}) {
  const o = parseJSONLoose(String(text).trim().startsWith('[') ? '{"list":' + String(text).trim() + '}' : text);
  const list = o.list || (o.entries) || [o];
  const entries = [];
  for (const e of list) {
    if (e.bones) entries.push(entry(e.position || defaults.position || 'lap', e.who || defaults.who || 'subject', e.beat || defaults.beat || 'base', e.bones, e.label));
    else for (const w of ['subject', 'giver']) if (isObj(e[w])) entries.push(entry(e.position || defaults.position || 'lap', w, e.beat || defaults.beat || 'base', e[w], e.label));
  }
  if (!entries.length) throw new Error('No poses found in that JSON.');
  return { entries, warn: [] };
}
function parsePoses(text, defaults = {}) {
  const t = String(text).trim();
  if (!t) throw new Error('Nothing to read.');
  if (/^==/m.test(t) || /pose editor report/i.test(t)) { const r = parseReport(t, defaults.position && defaults.position !== 'auto' ? defaults.position : null); if (!r.entries.length) throw new Error('That report has no edited bones in it.'); return r; }
  return parsePoseJSON(t, defaults);
}
// Adding an entry for the same position / who / beat replaces the earlier one's bones bone by bone.
function addPoses(entries) {
  for (const e of entries) {
    const hit = mem.poses.find(p => p.position === e.position && p.who === e.who && p.beat === e.beat);
    if (hit) { hit.bones = { ...hit.bones, ...e.bones }; if (e.label) hit.label = e.label; } else mem.poses.push({ ...e, bones: { ...e.bones } });
  }
  save();
}
function removePose(i) { mem.poses.splice(i, 1); save(); }
function clearPoses() { mem.poses = []; save(); }
const posesFor = position => mem.poses.filter(p => p.position === position);

const api = { KEY, POSITIONS, deepMerge, load, save, get, set, parseDesign, designFor, applyDesign, setDesign, clearDesign, parsePoses, parseReport, parsePoseJSON, addPoses, removePose, clearPoses, posesFor, empty };
root.FairyShoeOverrides = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
