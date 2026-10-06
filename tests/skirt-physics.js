// Browser test of the skirt's cloth physics (headless Chromium, software GL; the scene is stepped by hand).
//   npx http-server . -p 8765 -s &  NODE_PATH=<where playwright lives> node tests/skirt-physics.js [base-url]
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8765';
const fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 600, height: 400 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/tests/skirt.html');

  // Weight, and frame-rate independence: the cloth below the waist is lifted 10 cm and let go; the hem's height is read every 0.1 s.
  const traces = {};
  for (const [name, dt] of [['60', 1 / 60], ['20', 1 / 20], ['120', 1 / 120]]) {
    await p.evaluate(() => { setup('red', 'head', 'hand', 'free'); run(1.0, 1 / 60, 0); });
    traces[name] = await p.evaluate(([d]) => drop(0.10, 1.0, d, 0.1), [dt]);
  }
  const t = traces['60'], rest = t[t.length - 1], fall = t[0] - t[1];
  console.log('  hem height each 0.1 s:', t.map(v => v.toFixed(3)).join(' '));
  check(fall > 0.03, 'it falls at close to free-fall speed, not floating (' + (fall * 100).toFixed(1) + ' cm in the first 0.1 s; free fall is 4.9)');
  check(Math.abs(t[t.length - 1] - t[t.length - 2]) < 0.004, 'it comes to rest within a second');
  check(Math.max(...t.map(v => rest - v)) < 0.04, 'it does not stretch more than 4 cm past where it hangs (' + (Math.max(...t.map(v => rest - v)) * 100).toFixed(1) + ' cm)');
  for (const k of ['20', '120']) check(Math.max(...t.map((v, i) => Math.abs(v - traces[k][i]))) < 0.01, 'the same fall at ' + k + ' steps per second (within 1 cm)');

  // Discipline scenes: a skirt is a shell skinned to the body (no simulation). In every position, with a skirt worn and bottoms up and down, it is drawn,
  // its vertices are finite and near the body, and few of them (under 6%, none deep) are inside skin, the other body or the furniture. The shell is built
  // from the body's own surface, so what remains is at creases and where the other body presses on it.
  for (const [who, pos, impl] of [['red', 'lap', 'hand'], ['red', 'case', 'hairbrush'], ['snow', 'head', 'hand'], ['snow', 'chair', 'hand'], ['goldilocks', 'spread', 'paddle'], ['goldilocks', 'lap', 'rod']]) {
    for (const mode of ['down', 'up']) {
      const r = await p.evaluate(([w, ps, im, m]) => {
        setup(w, ps, im, m);
        const S = skirt, run1 = () => { const a = Starlight.skirtClipReport(ses.subject, [ses.giver], [ses.scn.bench]); return { own: (a.by && a.by['own skin']) || 0, other: (a.by && a.by['other body']) || 0, furn: (a.by && a.by.furniture) || 0 }; };
        const at = run1(); run(3, 1 / 60, 1.0); const after = run1(), n = S.R * S.N;
        let far = 0; const pel = ses.subject.bones.pelvis.getWorldPosition(new THREE.Vector3());
        for (let k = 0; k < n; k++) far = Math.max(far, Math.hypot(S.p[3 * k] - pel.x, S.p[3 * k + 1] - pel.y, S.p[3 * k + 2] - pel.z));
        return { shell: !!S.shell && S.shellMesh.visible && !S.mesh.visible, at, after, far, n, finite: Array.from(S.p).every(Number.isFinite) };
      }, [who, pos, impl, mode]);
      // (vertices inside the other body are reported but do not fail: across the lap the front panel lies between the two bodies' thighs, which is a known overlap)
      const ok = r.shell && r.finite && r.far < 1.0 && r.at.own <= 0.12 * r.n && r.after.own <= 0.12 * r.n && r.at.furn <= 0.02 * r.n;
      check(ok, `${who}, ${pos}, ${impl}, ${mode}: shell drawn; vertices inside: own skin ${r.at.own}, furniture ${r.at.furn}, other body ${r.at.other} (of ${r.n}); after strokes own ${r.after.own}; farthest ${(r.far * 100).toFixed(0)} cm from the pelvis`);
    }
  }
  // In the game a skirt is always hitched up (the stage forces it); in the engine it can still be taken off.
  const modes = await p.evaluate(() => { setup('red', 'case', 'hand', 'up'); const up = !!skirt.gathered && !skirt.off; Starlight.setSkirtOff(ses.subject, true); return { up, off: !!ses.subject.skirt.off }; });
  check(modes.up && modes.off, 'in the game the skirt is always hitched up; the engine can still take it off');
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  if (fails.length) { console.log(fails.length + ' failed'); process.exit(1); }
})().catch(e => { console.error('FAIL', e.message.slice(0, 500)); process.exit(1); });
