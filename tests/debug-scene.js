// The debug scene (menu ▸ Debug scene): the game's own discipline scene without the room; joints can be posed and anchored; edits come out as a report.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.argv[2] || 'http://localhost:8765/index.html');
  const bad = [], ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad.push(m); };
  await p.click('button:has-text("Debug scene")'); await p.waitForSelector('h4:has-text("Beat")', { timeout: 60000 }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => { const st = __fs.app.stage; return !!st.session && !st.scene.getObjectByName('room').visible; }), 'the game\'s session is running, without the room');
  // pose the subject's left upper arm, anchor the left hand first
  await p.click('.dock button:text-is("Subject")'); await p.click('.dock button:text-is("handL")');
  const hand0 = await p.evaluate(() => { const c = __fs.app.stage.session.subject; return c.bones.handL.getWorldPosition(new c.group.position.constructor()).toArray(); });
  await p.click('.dock button:has-text("Anchor this joint")');
  await p.click('.dock button:text-is("upperArmL")');
  await p.evaluate(() => { const inp = document.querySelector('#dbg-sliders input[type=range]'); inp.value = 40; inp.dispatchEvent(new Event('input')); });
  const r = await p.evaluate(() => { const c = __fs.app.stage.session.subject, v = c.bones.handL.getWorldPosition(new c.group.position.constructor()); return v.toArray(); });
  const drift = Math.hypot(...r.map((x, i) => x - hand0[i]));
  ok(drift < 0.01, `an anchored hand stays put while the arm above it is posed (moved ${(drift * 100).toFixed(1)} cm)`);
  await p.click('.dock button:has-text("Make report")');
  const rep = await p.inputValue('.dock textarea');
  ok(/upperArmL/.test(rep) && /Overlaps now/.test(rep) && /Position: lap/.test(rep), 'the report names the edited bone, the setup and the overlaps');
  console.log(rep.split('\n').slice(0, 8).join('\n'));
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  if (bad.length) process.exit(1);
})().catch(e => { console.error('FAIL', e.message.slice(0, 400)); process.exit(1); });
