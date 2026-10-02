// The Fairy Shoe — the live correction. A wrapper over the engine's discipline scene: it builds the room, the furniture and the
// two bodies, lets the player smack, run and stop whenever they like, change position, implement, layers, pace and strength in
// the middle of it, and reports how far the resident has been brought (the pain model's distress), which is all the rules read.
(function (root) {
'use strict';
const S = root.Starlight, T = root.THREE, Room = root.FairyShoeRoom, Ov = root.FairyShoeOverrides;
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
const LAYER_LABELS = { skirt: ['Skirt down', 'Skirt hitched up'], bottoms: ['Bottoms down', 'Bottoms up'], briefs: ['Briefs down', 'Briefs up'] };
const CAMERAS = [['overview', 'Overview'], ['behind', 'Behind'], ['shoulder', 'Over your shoulder'], ['floor', 'From the floor']];
const PACE = [0.5, 0.75, 1, 1.25, 1.5, 2];
const STRENGTH = [0.4, 0.6, 0.8, 1, 1.25, 1.5];
const RUN = [4, 8, 12, 16, 24, 32, 48];
const OVERVIEW = {
  lap:    { pos: [2.5, 1.5, 3.2], target: [0, 0.6, 0.2] },
  case:   { pos: [-2.7, 1.45, -2.9], target: [-0.05, 0.85, -0.15] },
  head:   { pos: [-3.2, 1.45, -2.9], target: [-0.1, 0.9, -0.3] },
  chair:  { pos: [-2.8, 1.4, -3.0], target: [0.1, 0.8, -0.2] },
  spread: { pos: [-3.0, 1.45, -3.4], target: [-0.1, 0.85, -0.45] },
};

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

// ── Pose overrides (from the editor) ────────────────────────────
// The scene reads its pose tables every frame from the scene object, so a copy with the edited bones swapped in is enough.
function applyPoseOverrides(scn, position) {
  const list = Ov ? Ov.posesFor(position) : [];
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
  const controls = new T.OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
  const room = Room.buildRoom(scene);
  const resize = () => {
    const w = viewEl.clientWidth || 1, h = viewEl.clientHeight || 1;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  };
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(viewEl); else window.addEventListener('resize', resize);

  const marks = {};   // resident id → { marks, stripes }: kept through the day
  let session = null, running = false, last = 0, clock = 0, onFrame = null;

  // ── Cameras. 'overview' is free to orbit; the others follow the action: each frame they are aimed from where the
  // subject and the player are, and eased toward, so movement stays in view.
  const cam = { mode: 'overview', fov: 35, handover: 0, pos: new V3(), tgt: new V3() };
  function focusOf(ses) {
    const s = ses.subject, P = s.bones.pelvis.getWorldPosition(new V3()), H = s.bones.head.getWorldPosition(new V3());
    const fwd = new V3(H.x - P.x, 0, H.z - P.z); if (fwd.lengthSq() < 1e-4) fwd.set(1, 0, 0); fwd.normalize();
    const C = P.clone().addScaledVector(fwd, -0.07); C.y -= 0.02;   // the contact sites: the rear, a little behind and below the hip joint
    return { P, H, fwd, C };
  }
  const inRoom = (v, m = 0.3) => { const lim = Room.HALF - m; v.x = clamp(v.x, -lim, lim); v.z = clamp(v.z, -lim, lim); v.y = clamp(v.y, 0.08, Room.HEIGHT - 0.2); return v; };
  function desired(ses) {
    const f = focusOf(ses), g = ses.giver;
    if (cam.mode === 'behind') {
      const pos = f.C.clone().addScaledVector(f.fwd, -1.7); pos.y = f.C.y + 0.5;
      return { pos: inRoom(pos), tgt: f.C.clone(), fov: 38 };
    }
    if (cam.mode === 'shoulder') {
      const GS = g.bones.upperArmL.getWorldPosition(new V3()), GH = g.bones.head.getWorldPosition(new V3());
      const away = new V3(GS.x - f.C.x, 0, GS.z - f.C.z); if (away.lengthSq() < 1e-4) away.set(-1, 0, 0); away.normalize();
      const side = new V3(-away.z, 0, away.x);   // sideways, off the line of sight and away from the swinging (right) arm
      const left = side.dot(new V3(GS.x - GH.x, 0, GS.z - GH.z)) >= 0 ? 1 : -1;
      const pos = GS.clone().addScaledVector(away, 0.3).addScaledVector(side, 0.4 * left); pos.y = GS.y + 0.38;   // behind and above the player's left shoulder
      return { pos: inRoom(pos, 0.15), tgt: f.C.clone(), fov: 52 };
    }
    if (cam.mode === 'floor') {
      const pos = f.H.clone().addScaledVector(f.fwd, 1.7); pos.y = 0.14;
      return { pos: inRoom(pos), tgt: f.H.clone().add(new V3(0, 0.02, 0)), fov: 50 };
    }
    return null;
  }
  function setCamera(mode, snap) {
    if (!CAMERAS.some(c => c[0] === mode)) return;
    cam.mode = mode; cam.snap = !!snap; controls.enabled = mode === 'overview';
    if (mode === 'overview') { const o = session ? OVERVIEW[session.position] : null; if (o) { cam.go = { pos: new V3(...o.pos), tgt: new V3(...o.target), fov: 35 }; cam.handover = 1; } }
    else cam.go = null;
  }
  function updateCamera(dt) {
    const ease = cam.snap ? 1 : 1 - Math.exp(-dt * (cam.mode === 'overview' ? 5 : 4.5));
    cam.snap = false;
    let want = session && cam.mode !== 'overview' ? desired(session) : null;
    if (!want && cam.go) want = cam.go;
    if (want) {
      camera.position.lerp(want.pos, ease); controls.target.lerp(want.tgt, ease);
      camera.fov += (want.fov - camera.fov) * ease; camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      if (cam.go && camera.position.distanceTo(cam.go.pos) < 0.03) cam.go = null;
      if (cam.mode !== 'overview') return;
    } else if (cam.mode === 'overview' && Math.abs(camera.fov - 35) > 0.05) { camera.fov += (35 - camera.fov) * ease; camera.updateProjectionMatrix(); }
    controls.update();
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
      layers: { bottoms: true, briefs: false, skirt: false, ...(opts.layers || {}) }, implement: opts.implement || 'hand', position: opts.position || 'case' };
    let g = null, s = null, scn = null, furniture = null, plant = null;

    const derive = () => { const pace = PACE[st.paceIdx], m = STRENGTH[st.strengthIdx]; return { speed: pace, strength: Math.min(1, 0.66 * m), hold: 0.3 / pace, dwell: 0.6 / pace, face: clamp(0.1 + 0.45 * m * pace, 0.1, 1) }; };

    function teardown() {
      if (!scn) return;
      marks[opts.subjectId] = { marks: s.marks, stripes: s.stripes };
      scn.dispose();
      for (const c of [g, s]) S.disposeCharacter(c);
      g = s = scn = furniture = plant = null;
    }
    function applyLayers() {
      const L = st.layers;
      S.setLowered(s, 'bottom', !!L.bottoms);
      S.setLowered(s, 'briefs', !!L.bottoms && !!L.briefs);
      if (s.skirt) S.setSkirtOff(s, !L.skirt);
    }
    // The furniture the engine builds (a road case) is swapped for the room's own, built to the same size and put in the same place.
    function furnish(position, seatTop) {
      const old = scn.bench;
      let made = null;
      if (old) {
        const b = new T.Box3().setFromObject(old); scene.remove(old); Room.disposeGroup(old);
        if (position === 'lap') { made = Room.buildChair(b.max.y, b.max.x - b.min.x, b.max.z - b.min.z); made.position.set((b.min.x + b.max.x) / 2, 0, (b.min.z + b.max.z) / 2); }
        else { made = Room.buildTable(b.max.y, b.min.x, b.max.x, b.max.z - b.min.z); }
      } else if (position === 'chair') {
        // The chair the player sits in, set square in front of the subject with its back away from them: the hands go on its seat.
        made = new T.Group(); const chair = Room.buildChair(seatTop); chair.rotation.y = -Math.PI / 2; made.add(chair); furniture = chair;
        for (let i = 0; i < 2; i++) scn.update(0.016);
        plant = {};
        let cx = 0;
        for (const side of ['L', 'R']) {
          const sh = s.bones['upperArm' + side].getWorldPosition(new T.Vector3());
          const targetY = seatTop + 0.0085 * s.spec.H + 0.004, dy = Math.max(0, sh.y - targetY), r = S.armReach(s, side) * 0.9;
          const dx = Math.sqrt(Math.max(0.0025, r * r - dy * dy));
          plant[side] = new V3(sh.x + dx, targetY, clamp(sh.z, -0.15, 0.15) * 1);
          cx = Math.max(cx, plant[side].x);
        }
        chair.position.set(cx + 0.07, 0, 0);
        plant.cx = cx;
      }
      if (made) { scn.bench = made; scene.add(made); made.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
    }

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
      let seatTop = 0.45;
      if (position === 'chair') { const probe = S.seatGiver(g); seatTop = new T.Box3().setFromObject(probe.bench).max.y; Room.disposeGroup(probe.bench); }
      const D = derive();
      scn = S.createDisciplineScene(scene, g, s, { lower: !!st.layers.bottoms, position: ENGINE_POSITION[position], pain: opts.pain, faces: true, severity: D.face });
      applyLayers();
      let impl = cfg.implement || st.implement;
      if (position === 'spread' && !S.IMPLEMENTS[impl].dual) impl = 'paddle';
      st.implement = impl; scn.setImplement(impl); scn.setBeat('relaxed');
      scn.timing = { ...scn.timing, speed: D.speed };
      furnish(position, seatTop);
      applyPoseOverrides(scn, position);
      if (oldP && scn.pain) {
        for (const k of ['sting', 'ache', 'hits', 'last', 'dwell', 'atEdge', 'atLimit', 'tooHarsh', 'peak']) scn.pain[k] = oldP[k];
        scn.pain.update(cfg.elapsed || 0, false);   // the time it took
      }
      scn.onImpact = (side, strength) => { st.smacks++; Sound.clap(st.implement, strength); if (api.onImpact) api.onImpact(api); };
      api.scn = scn; api.pain = scn.pain; api.subject = s; api.giver = g;
      if (cam.mode === 'overview') { const o = OVERVIEW[position]; camera.position.set(...o.pos); controls.target.set(...o.target); camera.fov = 35; camera.updateProjectionMatrix(); cam.go = null; }
    }

    const api = {
      st, scn: null, pain: null, subject: null, giver: null,
      get position() { return st.position; },
      get implement() { return st.implement; },
      get busy() { return scn.busy(); },
      get layers() { return st.layers; },
      layerAvailable() { const w = s.spec.m.wardrobe || {}; return { skirt: !!s.skirt, bottoms: !!w.bottom, briefs: !!w.briefs }; },
      setLayer(name, on) {
        st.layers[name] = on; if (name === 'bottoms' && !on) st.layers.briefs = false;
        applyLayers();
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
        scn.update(dt);
        if (plant) {   // hands on the chair: planted on the seat however the body moves
          for (const side of ['L', 'R']) {
            const sh = s.bones['upperArm' + side].getWorldPosition(new T.Vector3()), out = side === 'L' ? -1 : 1;
            S.armIK(s, side, plant[side], sh.clone().add(new V3(-0.1, 0.05, out * 0.5)), new V3(0, 1, 0), new V3(1, 0, 0));
          }
        }
        for (const ch of on) S.fadeMarks(ch, dt);
        for (const ch of on) { ch.group.updateMatrixWorld(true); S.bustSpring(ch, dt); }
        for (const ch of on) S.bustContact(ch, on);
        S.updateContacts(on);
        const colliders = on.flatMap(S.bodyColliders);
        for (const ch of on) S.hairStep(ch, dt, colliders);
        for (const ch of on) S.faceStep(ch, dt);
        for (const ch of on) S.skirtStep(ch, dt, on, [scn.bench]);
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
  return { begin, end, loop, clearMarks, setCamera, get cameraMode() { return cam.mode; }, renderer, camera, controls, scene, get session() { return session; }, resize };
}

root.FairyShoeScene = { createStage, POSITIONS, IMPLEMENTS, CAMERAS, LAYER_LABELS, PACE, STRENGTH, RUN, Sound };
})(window);
