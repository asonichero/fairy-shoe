// Browser smoke test: plays through two days with Playwright (headless Chromium, software GL).
//   npx http-server . -p 8765 -s &  NODE_PATH=<where playwright lives> node tests/e2e-smoke.js [url] [screenshotDir]
// Corrections are ended without a stroke (software GL is far too slow to animate many), the rules themselves are covered by rules.test.js.
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8765/index.html', SHOTS = process.argv[3];
const shot = (p, n, o = {}) => SHOTS ? p.screenshot({ path: `${SHOTS}/${n}.png`, ...o }) : null;
// Everything the live dock offers, once: cameras, layers, pace and strength, a change of position, a fetched implement.
async function liveControls(p) {
  const dock = '.dock';
  for (const cam of ['Behind', 'Over your shoulder', 'Face', 'Overview']) await p.click(`${dock} >> button:text-is("${cam}")`);
  await p.click(`${dock} >> button:text-is("Bottoms down")`);                        // layers are live: bottoms up
  await p.click(`${dock} >> button:text-is("Bottoms up")`);
  await p.click(`${dock} >> button[aria-label="Pace up"]`); await p.click(`${dock} >> button[aria-label="Strength up"]`);
  await p.click(`${dock} >> button[aria-label="Run down"]`);
  const state = () => p.evaluate(() => ({ pos: __fs.app.live.position, impl: __fs.app.live.implement, pace: __fs.app.live.pace, strength: __fs.app.live.strengthMult, run: __fs.app.live.runLength, cam: __fs.app.stage.cameraMode }));
  let s = await state(); if (s.pace !== 1.25 || s.strength !== 1.25 || s.run !== 8 || s.cam !== 'overview') throw new Error('steppers or camera: ' + JSON.stringify(s));
  await p.click(`${dock} >> text=Change position`);
  await p.click('.overlay .pick:has-text("Across the lap")');
  await p.waitForSelector('#veil', { state: 'hidden', timeout: 90000 });
  s = await state(); if (s.pos !== 'lap') throw new Error('position did not change: ' + JSON.stringify(s));
  await p.click(`${dock} >> text=Change implement`);
  await p.click('.overlay .pick:has-text("Hairbrush")');
  await p.waitForSelector('.overlay .pick');                                          // the conversation
  await p.locator('.overlay .pick').first().click();
  await p.click('.overlay >> text=Continue');
  await p.waitForSelector('#veil', { state: 'hidden', timeout: 90000 });
  s = await state(); if (s.impl !== 'hairbrush' || s.pos !== 'lap') throw new Error('implement did not change: ' + JSON.stringify(s));
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
