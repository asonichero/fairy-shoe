// The pose editor can pin feet: with them pinned, moving the pelvis leaves both feet where they were (and turned the same way);
// unpinned, the feet come along. Needs a static server (see README).
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8765/editor.html';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#sc-on');
  await p.click('#sc-on'); await p.waitForTimeout(1500);
  await p.click('#pe-on'); await p.waitForTimeout(800);
  const run = pin => p.evaluate(pin => {
    const { PE, peDragBone, scn } = window.__viewer; PE.pinFeet = pin; PE.pin = true; PE.who = 'g';
    const ch = scn.g, feet = () => ['L', 'R'].map(s => ch.bones['foot' + s].getWorldPosition(new THREE.Vector3()));
    const q0 = ['L', 'R'].map(s => ch.bones['foot' + s].getWorldQuaternion(new THREE.Quaternion()));
    const before = feet(), pel = ch.bones.pelvis.getWorldPosition(new THREE.Vector3());
    peDragBone('pelvis', pel.clone().add(new THREE.Vector3(0.06, 0, 0.05)));
    const after = feet(), q1 = ['L', 'R'].map(s => ch.bones['foot' + s].getWorldQuaternion(new THREE.Quaternion()));
    return { move: before.map((v, i) => +v.distanceTo(after[i]).toFixed(4)), turn: q0.map((q, i) => +(q.angleTo(q1[i]) * 57.3).toFixed(2)), banner: document.getElementById('pe-pinfeet').classList.contains('on') };
  }, pin);
  const off = await run(false), on = await run(true);
  console.log('unpinned', JSON.stringify(off)); console.log('pinned  ', JSON.stringify(on));
  const bad = [];
  if (!off.move.every(m => m > 0.03)) bad.push('unpinned feet should come along');
  if (!on.move.every(m => m < 0.01) || !on.turn.every(t => t < 1)) bad.push('pinned feet should stay');
  if (errs.length) bad.push('page errors: ' + errs[0]);
  await b.close();
  if (bad.length) { console.error('FAIL ' + bad.join('; ')); process.exit(1); }
  console.log('ok');
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
