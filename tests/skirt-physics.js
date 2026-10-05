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

  // Baked skirt: in every position (the game's hitched-up skirt, and a loose one) after the settle and again after a few strokes, no cloth point
  // and no sample on a triangle is more than 3 mm inside skin or furniture of its own, the other body's or the room's.
  for (const [who, pos, impl] of [['red', 'lap', 'hand'], ['red', 'case', 'hairbrush'], ['snow', 'head', 'hand'], ['snow', 'chair', 'hand'], ['goldilocks', 'spread', 'paddle'], ['goldilocks', 'lap', 'rod']]) {
    for (const mode of ['down', 'up']) {
      const r = await p.evaluate(([w, ps, im, m]) => {
        setup(w, ps, im, m);
        const rep = () => { const a = Starlight.skirtClipReport(ses.subject, [ses.giver], [ses.scn.bench]); return { clipped: a.clipped, deepest: a.deepest, worst: a.worst }; };
        const baked = rep(), frozen = !!skirt.fz; run(4, 1 / 60, 1.0);
        return { baked, after: rep(), frozen, finite: mesh() };
      }, [who, pos, impl, mode]);
      const ok = r.finite && r.frozen && r.baked.clipped <= 3 && r.baked.deepest < 0.012 && r.after.clipped <= 15 && r.after.deepest < 0.015;
      check(ok, `${who}, ${pos}, ${impl}, ${mode}: baked ${r.baked.clipped} inside (deepest ${(r.baked.deepest * 1000).toFixed(1)} mm), after strokes ${r.after.clipped} (deepest ${(r.after.deepest * 1000).toFixed(1)} mm)`);
    }
  }
  // In the game a skirt is always hitched up (the stage forces it); in the engine it can still be taken off.
  const modes = await p.evaluate(() => { setup('red', 'case', 'hand', 'up'); const up = !!skirt.gathered && !skirt.off; Starlight.setSkirtOff(ses.subject, true); return { up, off: !!ses.subject.skirt.off }; });
  check(modes.up && modes.off, 'in the game the skirt is always hitched up; the engine can still take it off');
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  if (fails.length) { console.log(fails.length + ' failed'); process.exit(1); }
})().catch(e => { console.error('FAIL', e.message.slice(0, 500)); process.exit(1); });
