// The Fairy Shoe — debug scene. From the menu: straight into the game's own discipline scene (the same session code the game runs, FairyShoeScene.createSession,
// through the same stage), drawn without the room for speed, with the same choice of giver, subject, position and implement, every joint posable, joints that can be
// anchored (held where they are while the rest is posed), and a report of what was changed, to be pasted to Claude for the code change. Nothing is saved.
(function (root) {
'use strict';
const T = root.THREE, S = root.Starlight;
const R2D = 180 / Math.PI, r1 = v => Math.round(v * 10) / 10 || 0;
const BEATS = [['relaxed', 'Relaxed'], ['raised', 'Arm raised'], ['contact', 'Contact']];
const GROUPS = [['Spine', ['pelvis', 'spine1', 'spine2', 'neck', 'head']], ['Left arm', ['clavL', 'upperArmL', 'forearmL', 'handL', 'fingersL', 'thumbL']], ['Right arm', ['clavR', 'upperArmR', 'forearmR', 'handR', 'fingersR', 'thumbR']],
  ['Left leg', ['thighL', 'shinL', 'footL']], ['Right leg', ['thighR', 'shinR', 'footR']]];
const LIMB = { handL: ['upperArmL', 'forearmL', 'handL'], handR: ['upperArmR', 'forearmR', 'handR'], footL: ['thighL', 'shinL', 'footL'], footR: ['thighR', 'shinR', 'footR'] };
const wpos = o => o.getWorldPosition(new T.Vector3()), wquat = o => o.getWorldQuaternion(new T.Quaternion());
const eulerDeg = q => { const e = new T.Euler().setFromQuaternion(q, 'YXZ'); return [e.x * R2D, e.y * R2D, e.z * R2D]; };
function setWorldQuat(bone, q) { bone.quaternion.copy(wquat(bone.parent).invert().multiply(q)); bone.updateMatrixWorld(true); }
// Two bones reaching the end joint to `target`, the middle joint bending the way it already does (each bone turned as little as it can be).
function limbIK(ch, [a, b, c], target) {
  const A = ch.bones[a], B = ch.bones[b], C = ch.bones[c];
  const pa = wpos(A), pb = wpos(B), pc = wpos(C), L1 = pa.distanceTo(pb), L2 = pb.distanceTo(pc);
  const d = target.clone().sub(pa), dist = T.MathUtils.clamp(d.length(), Math.abs(L1 - L2) + 1e-4, (L1 + L2) * 0.9999);
  d.normalize();
  const bend = pb.clone().sub(pa); bend.addScaledVector(d, -bend.dot(d));
  if (bend.lengthSq() < 1e-10) { bend.set(0, 1, 0).cross(d); if (bend.lengthSq() < 1e-10) bend.set(1, 0, 0).cross(d); }
  bend.normalize();
  const cosA = T.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
  const E = pa.clone().addScaledVector(d, L1 * cosA).addScaledVector(bend, L1 * Math.sqrt(1 - cosA * cosA));
  S.rotateBoneWorld(A, new T.Quaternion().setFromUnitVectors(pb.sub(pa).normalize(), E.sub(pa).normalize()));
  const pb2 = wpos(B), pc2 = wpos(C), Tg = pa.clone().addScaledVector(d, dist);
  S.rotateBoneWorld(B, new T.Quaternion().setFromUnitVectors(pc2.sub(pb2).normalize(), Tg.sub(pb2).normalize()));
}

function show() {
  const F = root.__fs, { app, B, C, SC } = F, { h, $, setScreen, showStage, ensureStage, busy } = F.ui, Ed = root.FairyShoeEdits;
  const d = { giver: app.keeper || 'a', subject: C.ORDER[0], position: 'lap', implement: 'hand', beat: 'relaxed', who: 's', sel: null, bottoms: false, briefs: false,
    frozen: false, sess: null, base: null, anchors: {}, log: {}, dots: [], ground: true };
  let stage = null, alive = true;
  const el = {};   // the panel's parts that are redrawn

  // ── The scene ─────────────────────────────────────────────────
  const ch = w => w === 'g' ? d.sess.giver : d.sess.subject;
  async function build() {
    await busy('Setting the scene…', async () => {
      stage = await ensureStage(); showStage(true);
      d.sess = stage.begin({ giver: B.keeper(d.giver), subject: B.spec(d.subject), subjectId: d.subject, position: d.position, implement: d.implement, layers: { bottoms: d.bottoms, briefs: d.briefs } });
      stage.setEnvironment(false); stage.setCamera('overview', true);
      d.implement = d.sess.implement; d.anchors = {}; d.sel = null;
      settle(); drawDots(); refresh();
    });
  }
  // Runs the scene until it has come to rest at the beat, then holds it still for posing (what the pose table and the scene's own reaching make of it).
  function settle() {
    const s = d.sess; if (!s) return;
    s.frozen = false; s.setBeat(d.beat);
    for (let i = 0; i < 90; i++) s.tick(1 / 30, i / 30);
    s.frozen = true; d.frozen = true; d.anchors = {}; snapshot(); refresh();
  }
  function snapshot() {
    d.base = {}; for (const w of ['g', 's']) { const c = ch(w); d.base[w] = { q: {}, pos: c.group.position.clone() }; for (const b of S.BONES) d.base[w].q[b] = c.bones[b].quaternion.clone(); }
  }
  const beatKey = () => d.beat;

  // ── Anchors and editing ───────────────────────────────────────
  const aKey = (w, b) => w + ':' + b;
  function toggleAnchor() {
    if (!d.sel) return; const k = aKey(d.who, d.sel);
    if (d.anchors[k]) delete d.anchors[k]; else { const b = ch(d.who).bones[d.sel]; d.anchors[k] = { w: d.who, bone: d.sel, pos: wpos(b), quat: wquat(b) }; }
    refresh();
  }
  // Puts every anchored joint back where it was: the end joints of the arms and legs by reaching the limb (and keeping their turn), any other joint by turning its parent.
  function enforce(skip) {
    for (const a of Object.values(d.anchors)) {
      if (a.w !== d.who && false) continue;
      const c = ch(a.w); c.group.updateMatrixWorld(true);
      if (a.bone === skip) { a.pos = wpos(c.bones[a.bone]); a.quat = wquat(c.bones[a.bone]); continue; }   // the joint being posed itself: its position is kept, its turn follows the pose
      if (LIMB[a.bone]) { limbIK(c, LIMB[a.bone], a.pos); setWorldQuat(c.bones[a.bone], a.quat); }
      else { const par = c.bones[a.bone].parent; if (par && par !== c.group) { const pp = wpos(par); S.rotateBoneWorld(par, new T.Quaternion().setFromUnitVectors(wpos(c.bones[a.bone]).sub(pp).normalize(), a.pos.clone().sub(pp).normalize())); } }
      c.group.updateMatrixWorld(true);
    }
  }
  function setRot(axis, deg) {
    if (!d.sel) return; const c = ch(d.who), b = c.bones[d.sel], e = eulerDeg(b.quaternion); e[axis] = deg;
    b.quaternion.copy(S.degQ(e)); c.group.updateMatrixWorld(true); enforce(d.sel); noteEdit(); refresh(true);
  }
  function nudge(axis, m) {
    const c = ch(d.who), base = d.base[d.who].pos.clone(); const p = c.group.position.clone(); p.setComponent(axis, base.getComponent(axis) + m);
    c.group.position.copy(p); c.group.updateMatrixWorld(true); enforce(null); noteEdit(); refresh(true);
  }
  // What differs from the beat as the scene posed it, kept per beat and per person for the report.
  function noteEdit() {
    for (const w of ['g', 's']) {
      const c = ch(w), bones = {};
      for (const b of S.BONES) if (c.bones[b].quaternion.angleTo(d.base[w].q[b]) * R2D > 0.2) bones[b] = eulerDeg(c.bones[b].quaternion).map(r1);
      const moved = c.group.position.clone().sub(d.base[w].pos), k = w + '|' + beatKey();
      if (Object.keys(bones).length || moved.length() > 5e-4) d.log[k] = { w, beat: beatKey(), bones, moved: moved.toArray().map(v => r1(v * 100)) }; else delete d.log[k];
    }
  }
  function resetEdits() { for (const w of ['g', 's']) { const c = ch(w); for (const b of S.BONES) c.bones[b].quaternion.copy(d.base[w].q[b]); c.group.position.copy(d.base[w].pos); c.group.updateMatrixWorld(true); delete d.log[w + '|' + beatKey()]; } d.anchors = {}; refresh(); }

  // ── The joints, as dots in the view ───────────────────────────
  const dotGeo = new T.SphereGeometry(1, 12, 8);
  function drawDots() {
    for (const m of d.dots) { m.parent && m.parent.remove(m); m.material.dispose(); } d.dots = [];
    if (!d.sess) return;
    for (const w of ['g', 's']) for (const b of S.BONES) {
      if (/^bust|^thumb2|^fingers|^thumb/.test(b) && false) continue;
      const m = new T.Mesh(dotGeo, new T.MeshBasicMaterial({ color: w === 'g' ? 0x6aa8e8 : 0xe86a6a, depthTest: false, transparent: true, opacity: 0.85 }));
      m.renderOrder = 20; m.userData = { w, b }; m.scale.setScalar(0.012); stage.scene.add(m); d.dots.push(m);
    }
  }
  function frame() {
    if (!alive) return;
    for (const m of d.dots) {
      const { w, b } = m.userData, c = ch(w); if (!c) continue;
      const sel = d.sel === b && d.who === w, anch = !!d.anchors[aKey(w, b)];
      m.position.copy(wpos(c.bones[b])); m.visible = d.showDots !== false;
      m.scale.setScalar(sel ? 0.02 : 0.011); m.material.color.setHex(anch ? 0xffd24a : sel ? 0xffffff : w === 'g' ? 0x6aa8e8 : 0xe86a6a);
    }
  }
  const ray = new T.Raycaster(), mouse = new T.Vector2();
  let down = null;
  const onDown = e => { down = { x: e.clientX, y: e.clientY }; };
  const onUp = e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;   // a drag is the camera's
    const r = stage.renderer.domElement.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, stage.camera);
    // dots are drawn over everything: take the one nearest the pointer in the view
    let best = null, bd = 0.05; for (const m of d.dots) { if (!m.visible) continue; const p = m.position.clone().project(stage.camera), dd = Math.hypot(p.x - mouse.x, p.y - mouse.y); if (dd < bd) { bd = dd; best = m; } }
    if (best) { d.who = best.userData.w; d.sel = best.userData.b; refresh(); }
  };

  // ── Reports ───────────────────────────────────────────────────
  const POS = Object.fromEntries(SC.POSITIONS.map(p => [p[0], p[1]])), IMPL = Object.fromEntries(SC.IMPLEMENTS.map(p => [p[0], p[1]]));
  function overlaps() {
    const s = d.sess, subj = s.subject, giv = s.giver, out = [];
    const prox = S.posedProxies(giv), K = subj.skirt ? subj.skirt.skin : null;
    // the subject's skin inside the giver's body (their contact proxies), by bone
    const g = subj.mesh.geometry, pa = g.attributes.position.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array, by = {}, v = new T.Vector3();
    subj.group.updateMatrixWorld(true);
    for (let k = 0; k < pa.length / 3; k += 6) {
      v.set(pa[3 * k], pa[3 * k + 1], pa[3 * k + 2]); subj.mesh.boneTransform(k, v); v.applyMatrix4(subj.mesh.matrixWorld);
      let m = 1e9; const q = [v.x, v.y, v.z]; for (const P of prox) { const dd = S.primDist(q, P); if (dd < m) m = dd; }
      if (m < -0.004) { let bw = -1, bb = 0; for (let a = 0; a < 4; a++) if (sw[4 * k + a] > bw) { bw = sw[4 * k + a]; bb = si[4 * k + a]; } const n = S.BONES[bb], e = by[n] || (by[n] = { n: 0, deep: 0 }); e.n++; e.deep = Math.max(e.deep, -m); }
    }
    const sk = Object.entries(by).map(([b, e]) => `${b} ${e.n} pts, deepest ${r1(e.deep * 1000)} mm`);
    out.push('Subject\'s body inside the giver\'s: ' + (sk.length ? sk.join('; ') : 'none (over 4 mm)'));
    for (const [name, c, others] of [['Subject\'s skirt', subj, [giv]], ['Giver\'s skirt', giv, [subj]]]) {
      if (!c.skirt) continue; const r = S.skirtClipReport(c, others, [s.scn.bench]);
      out.push(name + ': ' + (r ? `${r.clipped} cloth points/triangle samples more than 3 mm in something (deepest ${r1(r.deepest * 1000)} mm; ${Object.entries(r.by || {}).map(([k, n]) => k + ' ' + n).join(', ') || 'triangles only'})` : 'not simulated'));
    }
    return out;
  }
  function report() {
    const L = ['== Debug scene report (build ' + (root.FS_BUILD || '?') + ') ==',
      `Position: ${d.position} (${POS[d.position]}). Giver ${B.KEEPERS[d.giver].name}, subject ${C.CHARACTERS[d.subject].name}, implement ${IMPL[d.implement]}. Bottoms ${d.bottoms ? 'down' : 'up'}, briefs ${d.briefs ? 'down' : 'up'}.`,
      `Looking at the beat: ${BEATS.find(b => b[0] === d.beat)[1]}.`, ''];
    const entries = [], notes = [];
    for (const e of Object.values(d.log)) {
      if (Object.keys(e.bones).length) entries.push({ position: d.position, who: e.w === 'g' ? 'giver' : 'subject', beat: e.w === 'g' ? e.beat : (e.beat === 'contact' ? 'contact' : 'base'), bones: e.bones });
      if (e.moved.some(v => Math.abs(v) > 0.05)) notes.push(`${e.w === 'g' ? 'Giver' : 'Subject'} body moved [${e.moved.join(', ')}] cm (x, y, z) at ${e.beat}.`);
    }
    if (entries.length) { L.push('Pose edits (entries for js/poses.js, local Euler degrees [x, y, z]):'); L.push(Ed ? Ed.poseReport(entries) : JSON.stringify(entries)); }
    else L.push('No pose edits.');
    if (notes.length) { L.push(''); L.push(...notes); }
    const an = Object.values(d.anchors); if (an.length) { L.push(''); L.push('Anchored while posing: ' + an.map(a => (a.w === 'g' ? 'giver ' : 'subject ') + a.bone).join(', ') + '.'); }
    L.push(''); L.push('Overlaps now:'); L.push(...overlaps().map(t => '  ' + t));
    return L.join('\n');
  }

  // ── The panel ─────────────────────────────────────────────────
  const btn = (label, on, fn, extra = {}) => h('button', { class: on ? 'on' : '', onclick: fn, ...extra }, label);
  const tabs = (items, cur, fn) => h('div', { class: 'tabs' }, items.map(([v, l, dis]) => btn(l, cur === v, () => fn(v), dis ? { disabled: true } : {})));
  function refresh(light) {
    if (!el.root) return;
    if (light) { redrawSliders(); return; }
    const wide = d.position === 'spread', dual = n => root.Starlight.IMPLEMENTS[n].dual;
    el.body.replaceChildren(
      h('h4', {}, 'Giver'), tabs(Object.keys(B.KEEPERS).map(k => [k, B.KEEPERS[k].name]), d.giver, v => { d.giver = v; build(); }),
      h('h4', {}, 'Subject'), tabs(C.ORDER.map(k => [k, C.CHARACTERS[k].name]), d.subject, v => { d.subject = v; build(); }),
      h('h4', {}, 'Position'), tabs(SC.POSITIONS.map(p => [p[0], p[1], p[0] === 'spread' && !dual(d.implement)]), d.position, v => { d.position = v; if (v === 'spread' && !dual(d.implement)) d.implement = 'paddle'; build(); }),
      h('h4', {}, 'Implement'), tabs(SC.IMPLEMENTS.map(p => [p[0], p[1], wide && !dual(p[0])]), d.implement, v => { d.implement = v; build(); }),
      h('h4', {}, 'Clothes'), h('div', { class: 'tabs' }, btn(d.bottoms ? 'Bottoms down' : 'Bottoms up', d.bottoms, () => { d.bottoms = !d.bottoms; if (!d.bottoms) d.briefs = false; d.sess.setLayer('bottoms', d.bottoms); d.sess.setLayer('briefs', d.briefs); settleLight(); }),
        btn(d.briefs ? 'Briefs down' : 'Briefs up', d.briefs, () => { if (!d.bottoms) return; d.briefs = !d.briefs; d.sess.setLayer('briefs', d.briefs); settleLight(); }, d.bottoms ? {} : { disabled: true })),
      h('h4', {}, 'Beat'), tabs(BEATS, d.beat, v => { d.beat = v; settle(); }),
      h('div', { class: 'tabs' }, btn(d.frozen ? 'Held still (posing)' : 'Running', d.frozen, () => { d.frozen = !d.frozen; d.sess.frozen = d.frozen; if (d.frozen) snapshot(); refresh(); }),
        btn('Smack', false, () => { d.frozen = false; d.sess.frozen = false; d.sess.smack(); refresh(); }), btn('Re-settle', false, () => { settle(); })),
      h('h4', {}, 'Camera'), h('div', { class: 'tabs' }, SC.CAMERAS.map(([v, l]) => btn(l, false, () => stage.setCamera(v))), btn('Joints', d.showDots !== false, () => { d.showDots = d.showDots === false; refresh(); })),
      h('h4', {}, 'Pose: whose joints'), tabs([['g', 'Giver'], ['s', 'Subject']], d.who, v => { d.who = v; d.sel = null; refresh(); }),
      ...GROUPS.map(([name, bones]) => h('div', {}, h('div', { class: 'sub', style: 'margin:6px 0 2px' }, name), h('div', { class: 'tabs' }, bones.map(b => btn(b, d.sel === b, () => { d.sel = b; refresh(); }, d.anchors[aKey(d.who, b)] ? { style: 'outline:1px solid #ffd24a' } : {}))))),
      h('div', { id: 'dbg-sliders' }),
      h('h4', {}, 'Report'),
      h('div', { class: 'tabs' }, btn('Make report', false, () => { el.out.value = report(); el.out.select(); }), btn('Copy', false, async () => { el.out.select(); try { await navigator.clipboard.writeText(el.out.value); } catch (e) { document.execCommand && document.execCommand('copy'); } }), btn('Reset this beat\'s edits', false, resetEdits)),
      el.out);
    redrawSliders();
  }
  function settleLight() { settle(); }
  function redrawSliders() {
    const box = $('#dbg-sliders'); if (!box) return; box.replaceChildren();
    if (!d.sel) { box.append(h('div', { class: 'sub' }, 'Click a joint dot in the view, or a joint above, to pose it.')); return; }
    const c = ch(d.who), b = c.bones[d.sel], e = eulerDeg(b.quaternion), anch = !!d.anchors[aKey(d.who, d.sel)];
    box.append(h('div', { class: 'sub', style: 'margin:8px 0 2px' }, [h('b', {}, (d.who === 'g' ? 'Giver ' : 'Subject ') + d.sel), ' · local rotation, degrees']),
      ...['x', 'y', 'z'].map((ax, i) => h('label', { class: 'dbg-row' }, ax + ' ', h('input', { type: 'range', min: -180, max: 180, step: 0.5, value: e[i], oninput: ev => { setRot(i, +ev.target.value); ev.target.nextSibling.textContent = r1(+ev.target.value); } }), h('span', {}, r1(e[i])))),
      h('div', { class: 'tabs', style: 'margin-top:6px' }, btn(anch ? 'Anchored here (tap to release)' : 'Anchor this joint', anch, toggleAnchor), btn('Release all', false, () => { d.anchors = {}; refresh(); })),
      h('div', { class: 'sub', style: 'margin:8px 0 2px' }, 'Move the whole body (cm from where the scene put it):'),
      ...['x', 'y', 'z'].map((ax, i) => { const cur = (c.group.position.getComponent(i) - d.base[d.who].pos.getComponent(i)) * 100; return h('label', { class: 'dbg-row' }, ax + ' ', h('input', { type: 'range', min: -15, max: 15, step: 0.1, value: cur, oninput: ev => { nudge(i, +ev.target.value / 100); ev.target.nextSibling.textContent = r1(+ev.target.value); } }), h('span', {}, r1(cur))); }));
  }

  // ── Screen ────────────────────────────────────────────────────
  el.out = h('textarea', { readonly: true, spellcheck: false, placeholder: 'The report appears here: copy it and paste it to Claude.', style: 'width:100%;box-sizing:border-box;height:200px;margin-top:6px;background:#101014;color:#b8b8c4;border:1px solid #2c2c36;font:11px ui-monospace,Consolas,monospace' });
  el.body = h('div', {});
  el.root = h('div', { class: 'dock', style: 'width:380px' },
    h('h2', {}, 'Debug scene'), h('div', { class: 'sub' }, 'The game\'s own discipline scene, without the room. Nothing here is saved: make a report and paste it to Claude.'),
    h('div', { class: 'row' }, h('button', { onclick: leave }, 'Back to the menu')), el.body);
  function leave() {
    alive = false;
    for (const m of d.dots) { m.parent && m.parent.remove(m); m.material.dispose(); }
    stage.renderer.domElement.removeEventListener('pointerdown', onDown); stage.renderer.domElement.removeEventListener('pointerup', onUp);
    stage.loop(null); stage.end(); stage.setEnvironment(true); document.body.classList.remove('live'); F.showIntro();
  }
  setScreen(h('div', { class: 'screen' }, el.root));
  document.body.classList.add('live');
  (async () => {
    stage = await ensureStage();
    stage.renderer.domElement.addEventListener('pointerdown', onDown); stage.renderer.domElement.addEventListener('pointerup', onUp);
    await build(); stage.loop(frame);
  })();
  const st = document.createElement('style'); st.textContent = '.dbg-row{display:flex;gap:8px;align-items:center;font-size:12px;margin:2px 0}.dbg-row input{flex:1}.dbg-row span{width:44px;text-align:right}'; document.head.appendChild(st);
}

root.FairyShoeDebug = { show };
})(window);
