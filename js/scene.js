// The Fairy Shoe — the live correction. A wrapper over the engine's discipline scene: it builds the room, the furniture and the
// two bodies, lets the player smack, run and stop whenever they like, change position, implement, layers, pace and strength in
// the middle of it, and reports how far the resident has been brought (the pain model's distress), which is all the rules read.
(function (root) {
'use strict';
const S = root.Starlight, T = root.THREE, Room = root.FairyShoeRoom, Poses = root.FairyShoePoses || {};
const V3 = T.Vector3;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// id, label, what it is. 'chair' is the engine's hands-on-knees scene with a chair set in front for the hands.
const POSITIONS = [
  ['lap', 'Across the lap', 'Seated, you draw them down across your knees.'],
  ['case', 'Over the table', 'Bent at the hips over the table, palms flat on the boards.'],
  ['head', 'Hands on head', 'Standing, fingers laced on top of the head.'],
  ['chair', 'Hands on the chair', 'Bent forward, hands on the seat of the chair you sit in.'],
  ['spread', 'Bent over, feet apart', 'Bent forward, feet wide, palms on the thighs. Wide implements only.'],
];
const ENGINE_POSITION = { lap: 'lap', case: 'case', head: 'head', chair: 'knees', spread: 'spread' };
const IMPLEMENTS = [
  ['hand', 'Hand', 'Nothing to fetch. Stings, and fades quickly.'],
  ['hairbrush', 'Hairbrush', 'Light and sharp; a dull ache follows.'],
  ['rod', 'Willow switch', 'Thin, fast, and leaves stripes. Hardest on a first stroke.'],
  ['paddle', 'Cedar paddle', 'Broad and heavy: both sides at once, a deep ache.'],
];
// Bottoms and briefs are down or up; a skirt is down (it drapes, and is simulated), hitched up at the back, or off.
const SKIRT_MODES = ['down', 'up', 'off'];
const skirtMode = v => v === true ? 'down' : !v ? 'off' : SKIRT_MODES.includes(v) ? v : 'down';
const LAYER_LABELS = { skirt: { down: 'Skirt down', up: 'Skirt hitched up', off: 'Skirt off' }, bottoms: ['Bottoms down', 'Bottoms up'], briefs: ['Briefs down', 'Briefs up'] };
const layerLabel = (name, v) => name === 'skirt' ? LAYER_LABELS.skirt[skirtMode(v)] : LAYER_LABELS[name][v ? 0 : 1];
const layerNext = (name, v) => name === 'skirt' ? SKIRT_MODES[(SKIRT_MODES.indexOf(skirtMode(v)) + 1) % SKIRT_MODES.length] : !v;
const CAMERAS = [['overview', 'Overview'], ['behind', 'Behind'], ['shoulder', 'Over your shoulder'], ['floor', 'Face']];
const PACE = [0.5, 0.75, 1, 1.25, 1.5, 2];
const STRENGTH = [0.4, 0.6, 0.8, 1, 1.25, 1.5];
const RUN = [4, 8, 12, 16, 24, 32, 48];

// ── Sound: a clap per smack ─────────────────────────────────────
const Sound = (() => {
  let ctx = null, buf = null, on = true;
  const init = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  };
  const burst = (t, dur, freq, peak) => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.002 + dur);
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t); s.stop(t + dur + 0.05);
  };
  const clap = (impl, strength = 1) => {
    if (!ctx || !on) return;
    const t = ctx.currentTime, k = 0.25 + 0.2 * strength;
    if (impl === 'hairbrush') { burst(t, 0.04, 3600, k); burst(t + 0.004, 0.06, 700, 0.55 * k); }
    else if (impl === 'rod') { burst(t, 0.03, 4800, k); burst(t + 0.002, 0.05, 1500, 0.4 * k); }
    else if (impl === 'paddle') { burst(t, 0.07, 2000, 1.1 * k); burst(t + 0.003, 0.11, 420, 0.8 * k); burst(t + 0.006, 0.05, 4200, 0.35 * k); }
    else { burst(t, 0.09, 2500, 0.9 * k); burst(t + 0.008, 0.05, 1100, 0.5 * k); }
  };
  return { init, clap, set: v => { on = v; } };
})();

// ── Pose edits (js/poses.js, from the editor's pose report) ─────
// The scene reads its pose tables every frame from the scene object, so a copy with the edited bones swapped in is enough.
function applyPoseOverrides(scn, position) {
  const list = Poses[position] || [];
  for (const e of list) {
    const q = Object.fromEntries(Object.entries(e.bones).filter(([b]) => scn.s.bones[b]).map(([b, v]) => [b, S.degQ(v)]));
    if (e.who === 'subject' && e.beat === 'base') scn.baseQ = { ...scn.baseQ, ...q };
    else if (e.who === 'subject') {
      const R = scn.buck ? scn.buckQ : scn.reactQ, out = {};
      for (const k of ['L', 'R']) out[k] = { ...R[k], ...(k === 'L' ? q : mirrorQ(q)) };
      out.B = Object.fromEntries(Object.keys(out.L).map(b => [b, out.L[b].clone().slerp(out.R[b], 0.5)]));
      scn[scn.buck ? 'buckQ' : 'reactQ'] = out;
    } else {
      const orig = scn.giverQ, cache = {};
      scn.giverQ = beat => { const base = orig(beat); if (beat !== e.beat) return base; return cache[scn.implement] || (cache[scn.implement] = { ...base, ...q }); };
      scn.giverQ.edited = true;
    }
  }
}
// The same edit on the other side of the body (the engine's mirrorPose: swap L/R and flip the roll and yaw).
function mirrorQ(q) {
  const out = {};
  for (const [b, v] of Object.entries(q)) {
    const name = /L$/.test(b) ? b.slice(0, -1) + 'R' : /R$/.test(b) ? b.slice(0, -1) + 'L' : b;
    const e = new T.Euler().setFromQuaternion(v, 'YXZ'); e.y = -e.y; e.z = -e.z;
    out[name] = new T.Quaternion().setFromEuler(e);
  }
  return out;
}

// ── Furniture ───────────────────────────────────────────────────
// The furniture the engine builds (a road case) is swapped for the room's own, built to the same size and put in the same place.
// For the hands-on-the-chair position there is none to swap: the chair the player sits in is set square in front of the subject,
// and the returned `plant` holds where each palm goes on its seat (see holdChairHands).
function chairSeatTop(g) {
  const probe = S.seatGiver(g), top = new T.Box3().setFromObject(probe.bench).max.y;
  Room.disposeGroup(probe.bench); return top;
}
function furnishScene(parent, scn, s, position, seatTop) {
  const old = scn.bench; let made = null, plant = null;
  if (old) {
    const b = new T.Box3().setFromObject(old); parent.remove(old); Room.disposeGroup(old);
    if (position === 'lap') { scn.seatTop = b.max.y; made = Room.buildChair(b.max.y, b.max.x - b.min.x, b.max.z - b.min.z); made.position.set((b.min.x + b.max.x) / 2, 0, (b.min.z + b.max.z) / 2); }
    else made = Room.buildTable(b.max.y, b.min.x, b.max.x, b.max.z - b.min.z);
  } else if (position === 'chair') {
    made = new T.Group(); const chair = Room.buildChair(seatTop); chair.rotation.y = -Math.PI / 2; made.add(chair);
    for (let i = 0; i < 2; i++) scn.update(0.016);
    plant = {}; let cx = 0;
    for (const side of ['L', 'R']) {
      const sh = s.bones['upperArm' + side].getWorldPosition(new T.Vector3());
      const targetY = seatTop + 0.0085 * s.spec.H + 0.004, dy = Math.max(0, sh.y - targetY), r = S.armReach(s, side) * 0.9;
      const dx = Math.sqrt(Math.max(0.0025, r * r - dy * dy));
      plant[side] = new V3(sh.x + dx, targetY, clamp(sh.z, -0.15, 0.15));
      cx = Math.max(cx, plant[side].x);
    }
    chair.position.set(cx + 0.07, 0, 0);
  }
  if (made) { made.userData.obb = true; scn.bench = made; parent.add(made);   // (cloth meets each board and leg, not one big box round the lot)
    made.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  return plant;
}
// Hands on the chair: planted on the seat however the body moves. Call each frame after the scene's own update.
function holdChairHands(s, plant) {
  for (const side of ['L', 'R']) {
    const sh = s.bones['upperArm' + side].getWorldPosition(new T.Vector3()), out = side === 'L' ? -1 : 1;
    S.armIK(s, side, plant[side], sh.clone().add(new V3(-0.1, 0.05, out * 0.5)), new V3(0, 1, 0), new V3(1, 0, 0));
  }
}

// ── Standard camera angles ──────────────────────────────────────
// Where each standard view puts the camera for a session's two bodies ({ subject, giver }, posed). The stage takes the camera there when
// a button is pressed; the editor does the same. (Frame: which way the subject faces, how upright they are, where the glutes are.)
const inRoom = (v, m = 0.3) => { const lim = Room.HALF - m; v.x = clamp(v.x, -lim, lim); v.z = clamp(v.z, -lim, lim); v.y = clamp(v.y, 0.08, Room.HEIGHT - 0.2); return v; };
function focusOf(ses) {
  const s = ses.subject, P = s.bones.pelvis.getWorldPosition(new V3()), H = s.bones.head.getWorldPosition(new V3());
  const lean = new V3(H.x - P.x, 0, H.z - P.z), leanLen = lean.length();
  let fwd = lean.normalize();
  if (leanLen < 0.25) { fwd = new V3(0, 0, 1).applyQuaternion(s.bones.pelvis.getWorldQuaternion(new T.Quaternion())); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(1, 0, 0); fwd.normalize(); }
  const up = 1 - clamp(leanLen / 0.5, 0, 1);   // 1 standing, 0 bent over
  const C = P.clone().addScaledVector(fwd, -0.07); C.y -= 0.03 + 0.03 * up;   // the contact sites: behind and a little below the hip joint
  return { P, H, fwd, up, C };
}
function cameraPose(mode, ses) {
  ses.subject.group.updateMatrixWorld(true); ses.giver.group.updateMatrixWorld(true);
  const f = focusOf(ses), g = ses.giver;
  if (mode === 'behind') {   // square behind the subject, a little above the contact sites, far enough back to take in both cheeks and the thighs
    const pos = f.C.clone().addScaledVector(f.fwd, -(1.6 + 0.6 * f.up)); pos.y = f.C.y + 0.4 + 0.1 * f.up;
    return { pos: inRoom(pos, 0.2), tgt: f.C.clone(), fov: 40 };
  }
  if (mode === 'shoulder') {   // the player's own view from just over the right shoulder (the striking arm's), looking down at the contact sites
    const GS = g.bones.upperArmR.getWorldPosition(new V3()), GH = g.bones.head.getWorldPosition(new V3());
    const out = new V3(GS.x - GH.x, 0, GS.z - GH.z); if (out.lengthSq() < 1e-4) out.set(1, 0, 0); out.normalize();
    const toward = new V3(f.C.x - GH.x, 0, f.C.z - GH.z); if (toward.lengthSq() < 1e-4) toward.set(1, 0, 0); toward.normalize();
    const pos = GH.clone().addScaledVector(out, 0.14).addScaledVector(toward, 0.2); pos.y = GH.y - 0.03;
    return { pos: inRoom(pos, 0.1), tgt: f.C.clone(), fov: 62 };
  }
  if (mode === 'floor') {   // the face, from in front of it, at the height that suits the pose
    const pos = f.H.clone().addScaledVector(f.fwd, 1.7); pos.y = clamp(f.H.y - 0.45, 0.14, 1.2);
    return { pos: inRoom(pos), tgt: f.H.clone().add(new V3(0, 0.02, 0)), fov: 50 };
  }
  // overview: a three-quarter view from behind, on the side away from the player, so the glutes, the player and the implement are in view
  const GH = g.bones.head.getWorldPosition(new V3());
  const side = new V3(-f.fwd.z, 0, f.fwd.x); if (side.dot(new V3(GH.x - f.C.x, 0, GH.z - f.C.z)) > 0) side.negate();
  const dir = f.fwd.clone().multiplyScalar(-Math.cos(0.6)).addScaledVector(side, Math.sin(0.6));
  const pos = f.C.clone().addScaledVector(dir, 2.5 + 0.5 * f.up); pos.y = f.C.y + 0.6 + 0.5 * f.up;
  return { pos: inRoom(pos, 0.25), tgt: f.C.clone().addScaledVector(f.fwd, 0.15).add(new V3(0, 0.1 + 0.3 * f.up, 0)), fov: 35 };
}

// ── The stage ───────────────────────────────────────────────────
function createStage(viewEl, { onGLProblem } = {}) {
  const renderer = new T.WebGLRenderer({ antialias: true });
  if (onGLProblem) S.watchGL(renderer, onGLProblem);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.localClippingEnabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  viewEl.appendChild(renderer.domElement);
  const scene = new T.Scene(); scene.background = new T.Color(0x120d08);
  const camera = new T.PerspectiveCamera(35, 1, 0.05, 40);
  const controls = new T.OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.minDistance = 0.35; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.55;
  const room = Room.buildRoom(scene);
  const resize = () => {
    const w = viewEl.clientWidth || 1, h = viewEl.clientHeight || 1;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  };
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(viewEl); else window.addEventListener('resize', resize);

  const marks = {};   // resident id → { marks, stripes }: kept through the day
  let session = null, running = false, last = 0, clock = 0, onFrame = null;

  // Standard angles (see cameraPose): a button takes the camera there; from then on the view is the user's to orbit, zoom and pan.
  const cam = { mode: 'overview', go: null, snap: false, framed: false };
  let api_onCam = null;
  controls.addEventListener('start', () => { cam.go = null; cam.mode = 'free'; if (api_onCam) api_onCam(); });   // the user has taken the view
  function setCamera(mode, snap) {
    if (!CAMERAS.some(c => c[0] === mode)) return;
    cam.mode = mode; cam.snap = !!snap;
    cam.go = session ? cameraPose(mode, session) : null;
  }
  function updateCamera(dt) {
    if (cam.go) {
      const ease = cam.snap ? 1 : 1 - Math.exp(-dt * 5);
      camera.position.lerp(cam.go.pos, ease); controls.target.lerp(cam.go.tgt, ease);
      camera.fov += (cam.go.fov - camera.fov) * ease; camera.updateProjectionMatrix();
      if (camera.position.distanceTo(cam.go.pos) < 0.01 && controls.target.distanceTo(cam.go.tgt) < 0.01) cam.go = null;
      cam.snap = false;
    }
    controls.update();
    // The user's orbit stays inside the room: never through a wall, the floor or the ceiling (the view slides along them instead).
    const lim = Room.HALF - 0.12, cp = camera.position;
    cp.x = clamp(cp.x, -lim, lim); cp.z = clamp(cp.z, -lim, lim); cp.y = clamp(cp.y, 0.1, Room.HEIGHT - 0.1);
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05) || 0.016; last = now; clock += dt;
    if (session) session.tick(dt, clock);
    if (onFrame) onFrame(dt, clock);
    room.update(clock);
    updateCamera(dt);
    renderer.render(scene, camera);
  }

  // ── A session: two bodies in the room. opts: { giver, subject (specs), subjectId, position, implement, layers, pain }
  function begin(opts) {
    if (session) session.dispose();
    const st = { smacks: 0, peak: 0, tooHarsh: false, mode: 'idle', toRun: 0, since: 0, paceIdx: 2, strengthIdx: 3, runIdx: 2, ended: false,
      layers: { bottoms: false, briefs: false, ...(opts.layers || {}), skirt: 'up' }   /* a skirt is always hitched up for a correction */, implement: opts.implement || 'hand', position: opts.position || 'case' };
    let g = null, s = null, scn = null, furniture = null, plant = null;

    const derive = () => { const pace = PACE[st.paceIdx], m = STRENGTH[st.strengthIdx]; return { speed: pace, strength: Math.min(1, 0.66 * m), hold: 0.3 / pace, dwell: 0.6 / pace, face: clamp(0.1 + 0.45 * m * pace, 0.1, 1) }; };

    function teardown() {
      if (!scn) return;
      marks[opts.subjectId] = { marks: s.marks, stripes: s.stripes };
      scn.dispose();
      for (const c of [g, s]) S.disposeCharacter(c);
      g = s = scn = furniture = plant = null;
    }
    function applyLayers(settle) {
      const L = st.layers;
      S.setLowered(s, 'bottom', !!L.bottoms);
      S.setLowered(s, 'briefs', !!L.bottoms && !!L.briefs);
      if (!s.skirt) return;
      const mode = skirtMode(L.skirt), was = s.skirt.off ? 'off' : s.skirt.gathered ? 'up' : 'down';
      S.setSkirtOff(s, mode === 'off');
      if (mode !== 'off') S.setSkirtGathered(s, mode === 'up');
      if (settle && mode !== 'off' && mode !== was && !s.skirt.hybrid) settleSkirt();   // (a hybrid skirt is cloth held at the waist and carried by the body: bottoms or briefs coming down or up never restart it)
    }
    // The skirt is put on over the pose she is already in: it is dropped and draped (see Starlight.settleSkirt).
    function settleSkirt() { scn.update(0.016); scn.update(0.016); S.settleSkirt(s, [g], [scn.bench]); }
    function make(cfg = {}) {
      const position = cfg.position || st.position;
      const oldP = scn && scn.pain;
      teardown();
      st.position = position;
      const mk = spec => S.buildCharacter(S.clone(spec), { voxel: 0.011, key: spec.name });
      g = mk(opts.giver); s = mk(opts.subject);
      for (const c of [g, s]) { scene.add(c.group); scene.add(c.helper); c.helper.visible = false; }
      const sv = marks[opts.subjectId];
      if (sv) { s.marks = sv.marks; s.stripes = sv.stripes; S.copyMarks(s, s); }
      const seatTop = position === 'chair' ? chairSeatTop(g) : 0.45;
      const D = derive();
      scn = S.createDisciplineScene(scene, g, s, { lower: !!st.layers.bottoms, position: ENGINE_POSITION[position], pain: opts.pain, faces: true, severity: D.face });
      if (s.skirt) S.setSkirtHybrid(s, true);   // the subject's skirt in a discipline scene: the gathered back is driven by the body, the front and sides are cloth (see Starlight.setSkirtHybrid)
      applyLayers();
      let impl = cfg.implement || st.implement;
      if (position === 'spread' && !S.IMPLEMENTS[impl].dual) impl = 'paddle';
      st.implement = impl; scn.setImplement(impl); scn.setBeat('relaxed');
      scn.timing = { ...scn.timing, speed: D.speed };
      furniture = null; plant = furnishScene(scene, scn, s, position, seatTop);
      if (position === 'lap' && scn.seatTop != null) {
        // The seated disciplinarian's weight is on the chair: the pair sit a little higher, so the thighs rest on the seat and not in it, and the
        // seat flattens the glutes (the contact shader, as a palm flattens skin) so that they are pressed on it and never pass through it.
        const up = 0.012 * g.spec.H / 1.7;
        for (const c of [g, s]) { c.group.position.y += up; c.group.updateMatrixWorld(true); }
        const pel = g.bones.pelvis.getWorldPosition(new T.Vector3());
        S.setPress(g, new T.Vector3(pel.x, scn.seatTop, pel.z), new T.Vector3(0, -1, 0), 0.24 * g.spec.H / 1.7, 1, '', null, 0, 0.08);
      }
      applyPoseOverrides(scn, position);
      if (s.skirt && skirtMode(st.layers.skirt) !== 'off') settleSkirt();
      if (g.skirt) { scn.update(0.016); S.settleSkirt(g, [s], [scn.bench], 1.5, false); }   // the player's own skirt (a dress) drapes over the seat or the stance
      if (oldP && scn.pain) {
        for (const k of ['sting', 'ache', 'hits', 'last', 'dwell', 'atEdge', 'atLimit', 'tooHarsh', 'peak']) scn.pain[k] = oldP[k];
        scn.pain.update(cfg.elapsed || 0, false);   // the time it took
      }
      scn.onImpact = (side, strength) => { st.smacks++; Sound.clap(st.implement, strength); if (api.onImpact) api.onImpact(api); };
      api.scn = scn; api.pain = scn.pain; api.subject = s; api.giver = g;
      if (cam.mode !== 'free') { const o = cameraPose(cam.mode, { subject: s, giver: g }); camera.position.copy(o.pos); controls.target.copy(o.tgt); camera.fov = o.fov; camera.updateProjectionMatrix(); camera.lookAt(o.tgt); cam.go = null; }
      else if (!cam.framed) { const o = cameraPose('overview', { subject: s, giver: g }); camera.position.copy(o.pos); controls.target.copy(o.tgt); camera.fov = o.fov; camera.updateProjectionMatrix(); camera.lookAt(o.tgt); cam.framed = true; }
    }

    const api = {
      st, scn: null, pain: null, subject: null, giver: null,
      get position() { return st.position; },
      get implement() { return st.implement; },
      get busy() { return scn.busy(); },
      get layers() { return st.layers; },
      layerAvailable() { const w = s.spec.m.wardrobe || {}; return { bottoms: !!w.bottom, briefs: !!w.briefs }; },
      setLayer(name, on) {
        st.layers[name] = on; if (name === 'bottoms' && !on) st.layers.briefs = false;
        applyLayers(true);
      },
      // A live change of implement (to or from the hand). Anything else is fetched: see rebuild.
      setImplement(n) { if (st.position === 'spread' && !S.IMPLEMENTS[n].dual) return false; st.implement = n; scn.setImplement(n); scn.setBeat('relaxed'); return true; },
      // Builds the room and bodies again (a new position, or a new implement that has been fetched), keeping the pain and the marks.
      rebuild(cfg) { make(cfg); },
      setBeat(b) { scn.setBeat(b); },
      get pace() { return PACE[st.paceIdx]; }, get strengthMult() { return STRENGTH[st.strengthIdx]; }, get runLength() { return RUN[st.runIdx]; },
      stepPace(d) { st.paceIdx = clamp(st.paceIdx + d, 0, PACE.length - 1); const D = derive(); scn.timing = { ...scn.timing, speed: D.speed }; scn.severity = D.face; },
      stepStrength(d) { st.strengthIdx = clamp(st.strengthIdx + d, 0, STRENGTH.length - 1); scn.severity = derive().face; },
      stepRun(d) { st.runIdx = clamp(st.runIdx + d, 0, RUN.length - 1); },
      canStrike() { return !st.ended && !scn.busy() && !(scn.pain && scn.pain.tooHarsh); },
      // One whole smack: lift, hold, strike, and the hand stays on the skin until the next.
      smack() { if (!api.canStrike()) return false; st.mode = 'single'; Sound.init(); const D = derive(); scn.cycle(D.strength, undefined, undefined, D.hold); st.since = 0; return true; },
      run(n) { if (st.ended) return; Sound.init(); st.mode = 'run'; st.toRun = n == null ? RUN[st.runIdx] : n; st.since = derive().dwell; },
      stop() { st.mode = 'idle'; st.toRun = 0; },
      get running() { return st.mode === 'run'; },
      distress() { return scn.pain ? scn.pain.distress() : 0; },
      band() { return scn.pain ? scn.pain.band() : ''; },
      receptivity() { return scn.pain ? scn.pain.receptivity() : 0; },
      // The end of the correction: nothing more is struck; what was done is returned for the rules to score.
      finish() {
        st.ended = true; st.mode = 'idle'; scn.lower(0.8);
        marks[opts.subjectId] = { marks: s.marks, stripes: s.stripes };
        const P = scn.pain;
        return { peak: Math.max(st.peak, P ? P.distress() : 0), tooHarsh: !!(P && P.tooHarsh), smacks: st.smacks, implement: st.implement };
      },
      onChange: null, onImpact: null,
      tick(dt, t) {
        if (!scn) return;
        const P = scn.pain;
        if (st.mode === 'run' && !st.ended) {
          st.since += dt;
          const D = derive();
          if (!scn.busy() && st.since > D.dwell) {
            if (st.toRun <= 0 || (P && P.tooHarsh)) st.mode = 'idle';
            else { scn.cycle(D.strength, undefined, undefined, D.hold); st.toRun--; st.since = 0; }
          }
        }
        if (P && P.tooHarsh && !st.ended) { st.mode = 'idle'; st.tooHarsh = true; }
        const on = [g, s];
        for (const ch of on) S.animateCharacter(ch, dt, t);
        scn.clothLift = s.skirt && !s.skirt.off && !s.skirt.gathered ? S.SKIRT_THICK * 0.7 : 0;   // the palm lands on the skirt, not through it
        scn.update(dt);
        if (plant) holdChairHands(s, plant);   // hands on the chair
        for (const ch of on) S.fadeMarks(ch, dt);
        for (const ch of on) { ch.group.updateMatrixWorld(true); S.bustSpring(ch, dt); }
        for (const ch of on) S.bustContact(ch, on);
        S.updateContacts(on);
        const colliders = on.flatMap(S.bodyColliders);
        for (const ch of on) S.hairStep(ch, dt, colliders);
        for (const ch of on) S.faceStep(ch, dt);
        if (scn.tool && scn.tool.grp) scn.tool.grp.userData.obb = true;
        for (const ch of on) S.skirtStep(ch, dt, on, [scn.bench, scn.tool && scn.tool.grp]);
        for (const ch of on) S.bunchStep(ch);
        if (P) st.peak = Math.max(st.peak, P.distress());
        if (api.onChange) api.onChange(api);
      },
      dispose() { teardown(); if (session === api) session = null; },
    };
    make({});
    session = api;
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    return api;
  }
  function end() { if (session) session.dispose(); session = null; if (!onFrame) running = false; }
  // The editor draws its own things in the room: a per-frame callback keeps the loop going with or without a session.
  function loop(fn) { onFrame = fn; if (fn && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); } if (!fn && !session) running = false; }
  function clearMarks() { for (const k of Object.keys(marks)) delete marks[k]; }
  return { begin, end, loop, clearMarks, setCamera, onCameraTaken: fn => { api_onCam = fn; }, get cameraMode() { return cam.mode; }, renderer, camera, controls, scene, get session() { return session; }, resize };
}

root.FairyShoeScene = { cameraPose, layerLabel, layerNext, skirtMode, furnishScene, holdChairHands, chairSeatTop, applyPoseOverrides, createStage, POSITIONS, IMPLEMENTS, CAMERAS, LAYER_LABELS, PACE, STRENGTH, RUN, Sound };
})(window);
