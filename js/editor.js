// The Fairy Shoe — character editor. Paste changes to a resident's design or to the correction scene's poses, see them, and save
// them for the game (overrides.js keeps them in localStorage; bodies.js and scene.js apply them).
(function () {
'use strict';
const S = window.Starlight, T = window.THREE, B = window.FairyShoeBodies, C = window.FairyShoeContent, SC = window.FairyShoeScene, Ov = window.FairyShoeOverrides;
const $ = id => document.getElementById(id);
const h = (tag, attrs, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs || {})) { if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v); } for (const x of kids.flat()) if (x != null) e.append(x.nodeType ? x : document.createTextNode(x)); return e; };
Ov.load();

const WHO = [...C.ORDER.map(id => [id, C.CHARACTERS[id].name]), ...Object.entries(B.KEEPERS).map(([k, v]) => ['keeper-' + k, 'You: ' + v.label])];
const specFor = key => key.startsWith('keeper-') ? B.keeper(key.slice(7)) : B.spec(key);
const st = { who: 'red', mode: 'stand', pose: 'Relaxed', position: 'case', implement: 'hand', beat: 'relaxed', hold: false, stage: null, ses: null, ch: null, undo: [] };

function say(text, kind) { const m = $('msg'); m.textContent = text || ''; m.className = 'msg ' + (kind || ''); }
async function busy(text, fn) { $('loading-text').textContent = text; $('loading').hidden = false; await new Promise(r => setTimeout(r, 40)); try { return await fn(); } finally { $('loading').hidden = true; } }
function snapshot() { st.undo.push(JSON.stringify(Ov.get())); if (st.undo.length > 30) st.undo.shift(); }

// ── The preview ─────────────────────────────────────────────────
function clearPreview() {
  if (st.ses) { st.ses.onChange = null; st.stage.end(); st.ses = null; }
  if (st.ch) { st.stage.scene.remove(st.ch.group, st.ch.helper); S.disposeCharacter(st.ch); st.ch = null; }
}
async function rebuild() {
  await busy('Building…', async () => {
    st.stage = st.stage || SC.createStage($('stage'), { onGLProblem: msg => { const b = $('glbanner'); b.textContent = msg; b.hidden = false; } });
    clearPreview();
    const cam = st.stage.camera, ctl = st.stage.controls;
    if (st.mode === 'stand') {
      const ch = S.buildCharacter(S.clone(specFor(st.who)), { voxel: 0.011, key: st.who });
      st.stage.scene.add(ch.group); ch.helper.visible = false; S.resetCharacter(ch, st.pose); st.ch = ch;
      cam.position.set(0.2, 1.25, 3.1); ctl.target.set(0, 0.9, 0); ctl.update();
      st.stage.loop((dt, t) => { if (!st.ch) return; S.animateCharacter(st.ch, dt, t); st.ch.group.updateMatrixWorld(true); S.hairStep(st.ch, dt, S.bodyColliders(st.ch)); S.faceStep(st.ch, dt); });
    } else {
      st.stage.loop(null);
      const isKeeper = st.who.startsWith('keeper-');
      const subjectKey = isKeeper ? 'red' : st.who, subject = isKeeper ? specFor('red') : specFor(st.who);
      st.ses = st.stage.begin({ giver: isKeeper ? specFor(st.who) : B.keeper('a'), subject, subjectId: subjectKey, position: st.position, implement: st.implement, layers: { bottoms: true, briefs: false, skirt: false }, pain: { ...C.CHARACTERS[subjectKey].pain } });
      st.ses.setBeat(st.beat);
      st.ses.onChange = () => { if (st.hold) st.ses.scn.reaction = 1; };
      st.stage.setCamera('overview');
    }
  });
}

// ── The controls ────────────────────────────────────────────────
function tabs(el, items, get, onPick) {
  el.replaceChildren(...items.map(([v, l]) => h('button', { 'data-v': v, class: get() === v ? 'on' : '', onclick: () => { onPick(v); el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === get())); } }, l)));
}
function build() {
  const who = $('who'); who.replaceChildren(...WHO.map(([k, l]) => h('option', { value: k }, l))); who.value = st.who;
  who.onchange = () => { st.who = who.value; $('design').value = ''; rebuild(); };
  $('mode').querySelectorAll('button').forEach(b => b.onclick = () => { st.mode = b.dataset.v; $('mode').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('standOpts').hidden = st.mode !== 'stand'; $('sceneOpts').hidden = st.mode !== 'scene'; rebuild(); });
  tabs($('poses'), ['A-pose', 'Relaxed', 'Wait', 'Watch', 'Downcast', 'Sit', 'Bow'].map(p => [p, p]), () => st.pose, p => { st.pose = p; if (st.ch) S.setPose(st.ch, p, true); });
  tabs($('pos'), SC.POSITIONS.map(([v, l]) => [v, l]), () => st.position, p => { st.position = p; if (p === 'spread' && !window.Starlight.IMPLEMENTS[st.implement].dual) st.implement = 'paddle'; tabs($('impl'), implItems(), () => st.implement, onImpl); rebuild(); });
  const onImpl = v => { st.implement = v; if (st.ses && !st.ses.setImplement(v)) { say('That position takes a wide implement.', 'bad'); } };
  const implItems = () => SC.IMPLEMENTS.map(([v, l]) => [v, l]);
  tabs($('impl'), implItems(), () => st.implement, onImpl);
  $('beat').querySelectorAll('button[data-v]').forEach(b => b.onclick = () => { st.beat = b.dataset.v; $('beat').querySelectorAll('button[data-v]').forEach(x => x.classList.toggle('on', x === b)); if (st.ses) st.ses.setBeat(st.beat); });
  $('hold').onclick = () => { st.hold = !st.hold; $('hold').classList.toggle('on', st.hold); if (st.ses && !st.hold) st.ses.scn.reaction = 0; };
  tabs($('cams'), SC.CAMERAS.map(([v, l]) => [v, l]), () => (st.stage ? st.stage.cameraMode : 'overview'), v => st.stage && st.stage.setCamera(v));
  const pd = $('posDefault'); for (const p of Ov.POSITIONS) pd.append(h('option', { value: p }, p));

  $('applyDesign').onclick = () => {
    try {
      const patch = Ov.parseDesign($('design').value);
      snapshot(); Ov.setDesign(st.who, patch); say('Saved. ' + Object.keys(patch).length + ' field(s) changed for ' + labelOf(st.who) + '.', 'ok'); rebuild();
    } catch (e) { say('Could not read that design: ' + e.message, 'bad'); }
  };
  $('showDesign').onclick = () => { $('design').value = JSON.stringify(specFor(st.who), null, 1); say('This is the design as the game now builds it. Edit and paste back what you want to change.'); };
  $('clearDesign').onclick = () => { snapshot(); Ov.clearDesign(st.who); say('Design changes for ' + labelOf(st.who) + ' removed.', 'ok'); rebuild(); };
  $('applyPoses').onclick = () => {
    try {
      const r = Ov.parsePoses($('poseText').value, { position: $('posDefault').value });
      snapshot(); Ov.addPoses(r.entries);
      say('Added ' + r.entries.length + ' pose edit(s).' + (r.warn.length ? '\n' + r.warn.join('\n') : ''), 'ok'); drawPoses();
      const first = r.entries[0]; if (first && st.mode === 'scene') { st.position = first.position; tabs($('pos'), SC.POSITIONS.map(([v, l]) => [v, l]), () => st.position, p => { st.position = p; rebuild(); }); rebuild(); }
    } catch (e) { say('Could not read those poses: ' + e.message, 'bad'); }
  };
  $('clearPoses').onclick = () => { snapshot(); Ov.clearPoses(); drawPoses(); say('All saved pose edits removed.', 'ok'); rebuild(); };
  $('exportAll').onclick = () => { const b = $('blob'); b.hidden = false; b.value = JSON.stringify(Ov.get(), null, 1); b.select(); say('Copy this to keep or move your changes.'); };
  $('importAll').onclick = () => {
    const b = $('blob');
    if (b.hidden) { b.hidden = false; b.value = ''; say('Paste an export here, then press Import again.'); return; }
    try { const o = JSON.parse(b.value); if (!o || typeof o.designs !== 'object' || !Array.isArray(o.poses)) throw new Error('Not an export from this editor.'); snapshot(); Ov.set(o); say('Imported.', 'ok'); drawPoses(); rebuild(); } catch (e) { say('Could not import: ' + e.message, 'bad'); }
  };
  $('undo').onclick = () => { const s = st.undo.pop(); if (!s) return say('Nothing to undo.'); Ov.set(JSON.parse(s)); say('Undone.', 'ok'); drawPoses(); rebuild(); };
  $('resetAll').onclick = () => { if (!confirm('Remove every saved design and pose change?')) return; snapshot(); Ov.set(Ov.empty()); say('Everything reset to the built-in designs and poses.', 'ok'); drawPoses(); rebuild(); };
}
const labelOf = k => (WHO.find(w => w[0] === k) || [k, k])[1];
function drawPoses() {
  const list = $('poseList'), poses = Ov.get().poses;
  list.replaceChildren(...(poses.length ? poses.map((p, i) => h('div', { class: 'item' }, h('span', {}, p.position + ' · ' + (p.who === 'giver' ? 'you' : 'resident') + ' · ' + p.beat, h('small', {}, Object.keys(p.bones).join(', '))), h('button', { onclick: () => { snapshot(); Ov.removePose(i); drawPoses(); rebuild(); } }, 'Remove'))) : [h('div', { class: 'sub' }, 'No saved pose edits.')]));
}

build(); drawPoses(); rebuild();
window.__editor = { st, Ov, rebuild };
})();
