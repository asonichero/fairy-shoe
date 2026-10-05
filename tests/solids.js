// Everything is solid: in every position, with the pose tables as they are, nobody passes into anybody or into the furniture or the floor
// (only breasts and glutes give, and a hand rests on them rather than in them). Needs a static server (see README).
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8765/tests/skirt.html';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  const fails = [];
  for (const [keeper, id] of [['a', 'red'], ['b', 'snow'], ['a', 'goldilocks']]) for (const pos of ['lap', 'case', 'head', 'chair', 'spread']) {
    const r = await p.evaluate(([k, id, pos]) => {
      window.__keeper = k; setup(id, pos, 'hand', 'up');
      for (let i = 0; i < 90; i++) { clock += 1 / 60; ses.tick(1 / 60, clock); }
      window.__solidOff = false; return Starlight.solidReport([ses.giver, ses.subject], [ses.scn.bench]);
    }, [keeper, id, pos]);
    r.forEach((s, i) => {
      const who = i ? id : 'keeper ' + keeper, bad = s.deepest > 8 || (s.body + s.furniture + s.self > 3 && s.deepest > 2);
      console.log((bad ? 'FAIL ' : 'ok   ') + who + ' in ' + pos + ': ' + s.body + ' points in the other body, ' + s.furniture + ' in furniture, ' + s.self + ' in its own trunk, deepest ' + s.deepest + ' mm' + (bad && s.worst ? ' (' + JSON.stringify(s.worst) + ')' : ''));
      if (bad) fails.push(who + ' ' + pos);
    });
  }
  if (errs.length) { console.log('FAIL page errors: ' + errs[0]); fails.push('errors'); }
  await b.close();
  if (fails.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message.slice(0, 400)); process.exit(1); });
