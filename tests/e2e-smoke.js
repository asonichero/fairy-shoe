// Browser smoke test: plays through two days with Playwright (headless Chromium, software GL).
//   npx http-server . -p 8765 -s &  NODE_PATH=<where playwright lives> node tests/e2e-smoke.js [url] [screenshotDir]
// Corrections are ended without a stroke (software GL is far too slow to animate many), the rules themselves are covered by rules.test.js.
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8765/index.html', SHOTS = process.argv[3];
const shot = (p, n, o = {}) => SHOTS ? p.screenshot({ path: `${SHOTS}/${n}.png`, ...o }) : null;
// Everything the live dock offers, once: cameras, layers, pace and strength, a change of position, a fetched implement.
async function liveControls(p) {
  const dock = '.dock';
  // the hitched-up skirt is the gathered roll, not cloth; and the orbit pivot follows the bodies
  const sk = await p.evaluate(() => { const s = __fs.app.live.subject, S = s && s.skirt; return S ? { roll: !!S.roll && S.roll.visible, cloth: S.mesh.visible, who: s.spec.m && s.spec.m.name } : null; });
  console.log('skirt in the live game:', JSON.stringify(sk));
  if (sk && (!sk.roll || sk.cloth)) throw new Error('the live skirt should be the roll');
  for (const cam of ['Behind', 'Over your shoulder', 'Face', 'Overview']) await p.click(`${dock} >> button:text-is("${cam}")`);
  // a real drag on the view orbits it, and the wheel zooms, from an anchor angle
  await p.click(`${dock} >> button:text-is("Behind")`); await p.waitForTimeout(2500);
  const cp = () => p.evaluate(() => { const c = __fs.app.stage.camera, t = __fs.app.stage.controls.target; return { p: c.position.toArray(), d: c.position.distanceTo(t) }; });
  console.log(await p.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y), c = __fs.app.stage.controls; return JSON.stringify({ el: el && (el.tagName + '.' + el.className), enabled: c.enabled, zoom: c.enableZoom, rotate: c.enableRotate, min: c.minDistance, max: c.maxDistance, pan: c.enablePan, canvas: __fs.app.stage.renderer.domElement.getBoundingClientRect().toJSON() }); }, [640, 250]));
  const c0 = await cp(), box = await p.locator('canvas').first().boundingBox(), mx = box.x + box.width * 0.5, my = box.y + box.height * 0.3;
  await p.mouse.move(mx, my); await p.mouse.down(); await p.mouse.move(mx + 160, my + 20, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(1500);
  const c1 = await cp(); console.log('drag moved the camera by', Math.hypot(...c1.p.map((v, i) => v - c0.p[i])).toFixed(3));
  if (Math.hypot(...c1.p.map((v, i) => v - c0.p[i])) < 0.2) throw new Error('dragging should orbit the camera');
  await p.mouse.move(mx, my); await p.mouse.wheel(0, -400); await p.waitForTimeout(1200);
  const c2 = await cp(); console.log('zoom changed the distance', c1.d.toFixed(2), '->', c2.d.toFixed(2));
  if (c2.d > c1.d - 0.03) throw new Error('the wheel should zoom');
  // the buttons are anchors: the user orbits and zooms about the anchor's point, which stays chosen and keeps its pivot
  await p.evaluate(() => { const st = __fs.app.stage; st.controls.dispatchEvent({ type: 'start' }); st.camera.position.add(new (st.camera.position.constructor)(0.3, 0.1, 0.2)); });
  if ((await p.evaluate(() => __fs.app.stage.cameraMode)) !== 'behind') throw new Error('orbiting should keep the anchor');
  await p.click(`${dock} >> button:text-is("Behind")`);
  if ((await p.evaluate(() => __fs.app.stage.cameraMode)) !== 'behind') throw new Error('a button should return to its angle');
  await p.click(`${dock} >> button:text-is("Overview")`);
  await p.click(`${dock} >> button:text-is("Bottoms up")`);                          // layers are live: bottoms down (they begin up)
  await p.click(`${dock} >> button:text-is("Bottoms down")`);
  await p.click(`${dock} >> button[aria-label="Pace up"]`); await p.click(`${dock} >> button[aria-label="Strength up"]`);
  await p.click(`${dock} >> button[aria-label="Run down"]`);
  const state = () => p.evaluate(() => ({ pos: __fs.app.live.position, impl: __fs.app.live.implement, pace: __fs.app.live.pace, strength: __fs.app.live.strengthMult, run: __fs.app.live.runLength, cam: __fs.app.stage.cameraMode }));
  let s = await state(); if (s.pace !== 1.25 || s.strength !== 1.25 || s.run !== 8 || s.cam !== 'overview') throw new Error('steppers or camera: ' + JSON.stringify(s));
  await p.click(`${dock} >> text=Change position`);
  await p.click('.overlay .pick:has-text("Over the table")');
  await p.waitForSelector('#veil', { state: 'hidden', timeout: 90000 });
  s = await state(); if (s.pos !== 'case') throw new Error('position did not change: ' + JSON.stringify(s));
  await p.click(`${dock} >> text=Change implement`);
  await p.click('.overlay .pick:has-text("Hairbrush")');
  await p.waitForSelector('.overlay .pick');                                          // the conversation
  await p.locator('.overlay .pick').first().click();
  await p.click('.overlay >> text=Continue');
  await p.waitForSelector('#veil', { state: 'hidden', timeout: 90000 });
  s = await state(); if (s.impl !== 'hairbrush' || s.pos !== 'case') throw new Error('implement did not change: ' + JSON.stringify(s));
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 820) } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await shot(p, 'intro', { fullPage: true });
  await p.fill('input[type=text]', 'Keeper');
  await p.click('text=Open the door');
  await p.click('.overlay >> text=Begin');
  await p.waitForSelector('.morning');
  await p.click('.overlay >> text=Close');
  for (let day = 1; day <= 2; day++) {
    for (let i = 0; i < 3; i++) { await p.locator('.res:not(.placed)').first().click(); await p.locator('.slot:not(.full)').first().click(); }
    await p.waitForSelector('.evening, .overlay:not([hidden])', { timeout: 8000 });
    if (await p.locator('.overlay:not([hidden]) .primary').count()) await p.click('.overlay .primary');
    let guard = 0;
    while (await p.locator('.evening').count() && guard++ < 6) {
      const n = await p.evaluate(() => __fs.R.pendingCards(__fs.app.g).length);
      if (!n) break;
      if (guard === 1 && day === 1) await shot(p, 'evening', { fullPage: true });
      if (guard % 2) {   // a word
        await p.locator('.choice').nth(1).click();
        const w = p.locator('.words .choice:not([disabled])');
        if (await w.count()) { await w.first().click(); await p.waitForSelector('.result'); if (day === 1 && guard === 1) await shot(p, 'reprieve', { fullPage: true }); await p.click('.result >> text=Next'); continue; }
      }
      await p.locator('.choice').first().click();
      await p.click('text=Bring them in');
      await p.waitForSelector('text=End the correction', { timeout: 90000 });
      if (day === 1 && guard === 2) await liveControls(p);
      await p.click('text=End the correction');
      await p.waitForSelector('.result');
      await p.click('.result >> text=Next');
    }
    // the evening may end with notices, then it is morning
    await p.waitForSelector('.morning, .overlay:not([hidden])', { timeout: 8000 });
    if (await p.locator('.overlay:not([hidden]) .primary').count()) await p.click('.overlay .primary');
    await p.waitForSelector('.morning');
  }
  const day = await p.evaluate(() => __fs.app.g.day), roster = await p.evaluate(() => __fs.app.g.roster.length);
  const saved = await p.evaluate(() => !!localStorage.getItem('fairyshoe.v1'));
  console.log(JSON.stringify({ day, roster, saved, errors: errs }));
  await b.close();
  if (errs.length || day !== 3 || roster !== 3 || !saved) process.exit(1);
})().catch(e => { console.error('FAIL', e.message.slice(0, 600)); process.exit(1); });
