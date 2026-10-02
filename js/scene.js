// The Fairy Shoe — the live correction. A thin wrapper over the engine's discipline scene: it builds the two bodies, lets the
// player raise, strike, run or stop whenever they like, and reports how far the resident has been brought (the pain model's
// distress), which is all the rules look at.
(function (root) {
'use strict';
const S = root.Starlight;

const POSITIONS = [['lap', 'Across the lap'], ['case', 'Over the case'], ['head', 'Hands on head'], ['knees', 'Hands on knees'], ['spread', 'Bent over, feet apart']];
const IMPLEMENTS = [['hand', 'Hand'], ['hairbrush', 'Hairbrush'], ['rod', 'Willow switch'], ['paddle', 'Cedar paddle']];
const CLOTHING = [['clothed', 'Over clothes'], ['bottoms', 'Bottoms down'], ['bared', 'Bared']];
// How hard each smack lands, how fast the arm moves, how many in a run, the hold before the swing and the hold after contact.
const SEVERITY = [
  { name: 'Light',  strength: 0.35, speed: 0.8,  count: 8,  hold: 0.15, dwell: 1.0 },
  { name: 'Medium', strength: 0.6,  speed: 1.0,  count: 12, hold: 0.3,  dwell: 0.6 },
  { name: 'Firm',   strength: 0.85, speed: 1.2,  count: 16, hold: 0.2,  dwell: 0.45 },
  { name: 'Severe', strength: 1.0,  speed: 1.45, count: 22, hold: 0.1,  dwell: 0.3 },
];
const SEV_FACE = [0.15, 0.45, 0.75, 1];
const CAMERA = {
  lap:    { pos: [2.5, 1.5, 3.2], target: [0, 0.6, 0.2] },
  case:   { pos: [-2.7, 1.45, -2.9], target: [-0.05, 0.85, -0.15] },
  head:   { pos: [-3.2, 1.45, -2.9], target: [-0.1, 0.9, -0.3] },
  knees:  { pos: [-2.8, 1.4, -3.0], target: [-0.05, 0.8, -0.2] },
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

// ── The stage ───────────────────────────────────────────────────
function createStage(viewEl, { onGLProblem } = {}) {
  const lin = S.lin;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  if (onGLProblem) S.watchGL(renderer, onGLProblem);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.localClippingEnabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  viewEl.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1d1a1f);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
  const controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xf6ecdc, 0x2a2420, 0.6));
  const key = new THREE.DirectionalLight(0xffe9cf, 1.25); key.position.set(2, 4, 3); key.castShadow = true;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -0.5, near: 0.5, far: 12 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa9b8ff, 0.5); rim.position.set(-2.5, 2.5, -3); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: lin(0x2a2420), roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const resize = () => {
    const w = viewEl.clientWidth || 1, h = viewEl.clientHeight || 1;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  };
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(viewEl); else window.addEventListener('resize', resize);

  const marks = {};   // resident id → { marks, stripes }: kept through the day
  let session = null, running = false, last = 0;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05) || 0.016; last = now;
    if (session) session.tick(dt, now / 1000);
    controls.update();
    renderer.render(scene, camera);
  }

  // Build the two bodies and the scene. opts: { giver (spec), subject (spec), subjectId, position, implement, clothing, pain }
  function begin(opts) {
    if (session) session.dispose();
    const mk = spec => S.buildCharacter(S.clone(spec), { voxel: 0.011, key: spec.name });
    const g = mk(opts.giver), s = mk(opts.subject);
    for (const c of [g, s]) { scene.add(c.group); scene.add(c.helper); c.helper.visible = false; }
    const sv = marks[opts.subjectId];
    if (sv) { s.marks = sv.marks; s.stripes = sv.stripes; S.copyMarks(s, s); }
    const pos = opts.position || 'case', clothing = opts.clothing || 'bottoms';
    let sevIdx = 1;
    const scn = S.createDisciplineScene(scene, g, s, { lower: clothing !== 'clothed', position: pos, pain: opts.pain, faces: true, severity: SEV_FACE[sevIdx] });
    if (clothing === 'bared') S.setLowered(s, 'briefs', true);
    let implement = opts.implement || 'hand';
    if (pos === 'spread' && !S.IMPLEMENTS[implement].dual) implement = 'paddle';
    scn.setImplement(implement); scn.setBeat('relaxed');
    const C = CAMERA[pos]; camera.position.set(...C.pos); controls.target.set(...C.target);

    const st = { smacks: 0, peak: 0, tooHarsh: false, mode: 'idle', toRun: 0, since: 0, strike: { ...SEVERITY[sevIdx] }, raised: false, begun: false, implement, ended: false };
    const on = [g, s];
    const api = {
      scn, st, pain: scn.pain, subject: s, giver: g,
      get implement() { return st.implement; },
      get busy() { return scn.busy(); },
      setImplement(n) {
        if (pos === 'spread' && !S.IMPLEMENTS[n].dual) return false;
        st.implement = n; scn.setImplement(n); if (!st.raised) scn.setBeat('relaxed'); return true;
      },
      setSeverity(i) { sevIdx = i; st.strike = { ...SEVERITY[i], ...st.strikeOverride }; scn.severity = SEV_FACE[i]; scn.timing = { ...scn.timing, speed: st.strike.speed }; },
      setStrike(k, v) { st.strike[k] = v; if (k === 'speed') scn.timing = { ...scn.timing, speed: v }; },
      get severityIndex() { return sevIdx; },
      canStrike() { return !st.ended && !scn.busy() && !(scn.pain && scn.pain.tooHarsh); },
      // One whole smack: lift, hold, strike.
      smack() { if (!api.canStrike()) return false; st.raised = false; st.mode = 'single'; st.begun = true; Sound.init(); scn.cycle(st.strike.strength, undefined, undefined, st.strike.hold); st.since = 0; return true; },
      // Raise and wait; the arm stays up (and the dread builds) until strike().
      raise() { if (!api.canStrike() || st.raised) return false; st.begun = true; Sound.init(); st.raised = true; scn.raise(); return true; },
      strikeNow() { if (!st.raised || scn.busy() || st.ended) return false; st.raised = false; st.mode = 'single'; scn.strike(st.strike.strength); st.since = 0; return true; },
      lower() { st.raised = false; st.mode = 'idle'; scn.lower(0.5); },
      run(n) { if (st.ended) return; st.begun = true; Sound.init(); st.mode = 'run'; st.toRun = n; st.since = st.strike.dwell; },
      stop() { st.mode = 'idle'; st.toRun = 0; },
      get running() { return st.mode === 'run'; },
      distress() { return scn.pain ? scn.pain.distress() : 0; },
      band() { return scn.pain ? scn.pain.band() : ''; },
      receptivity() { return scn.pain ? scn.pain.receptivity() : 0; },
      // The end of the correction: nothing more is struck; what was done is returned for the rules to score.
      finish() {
        st.ended = true; st.mode = 'idle'; st.raised = false; scn.lower(0.8);
        marks[opts.subjectId] = { marks: s.marks, stripes: s.stripes };
        const P = scn.pain;
        return { peak: Math.max(st.peak, P ? P.distress() : 0), tooHarsh: !!(P && P.tooHarsh), smacks: st.smacks, implement: st.implement };
      },
      onChange: null, onImpact: null,
      tick(dt, t) {
        const P = scn.pain;
        if (st.mode === 'run' && !st.ended) {
          st.since += dt;
          if (!scn.busy() && st.since > st.strike.dwell) {
            if (st.toRun <= 0 || (P && P.tooHarsh)) st.mode = 'idle';
            else { scn.cycle(st.strike.strength, undefined, undefined, st.strike.hold); st.toRun--; st.since = 0; }
          }
        }
        if (P && P.tooHarsh && !st.ended) { st.mode = 'idle'; st.tooHarsh = true; }
        for (const ch of on) S.animateCharacter(ch, dt, t);
        scn.update(dt);
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
      dispose() {
        if (st.live) return;
        marks[opts.subjectId] = marks[opts.subjectId] || { marks: s.marks, stripes: s.stripes };
        marks[opts.subjectId] = { marks: s.marks, stripes: s.stripes };
        scn.dispose();
        for (const c of [g, s]) S.disposeCharacter(c);
        if (session === api) session = null;
      },
    };
    scn.onImpact = (side, strength) => { st.smacks++; Sound.clap(st.implement, strength); if (api.onImpact) api.onImpact(api); };
    session = api; st.strikeOverride = {};
    api.setSeverity(sevIdx);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    return api;
  }
  function end() { if (session) session.dispose(); session = null; running = false; }
  function clearMarks() { for (const k of Object.keys(marks)) delete marks[k]; }
  return { begin, end, clearMarks, renderer, camera, controls, scene, get session() { return session; }, resize };
}

root.FairyShoeScene = { createStage, POSITIONS, IMPLEMENTS, CLOTHING, SEVERITY, Sound };
})(window);
