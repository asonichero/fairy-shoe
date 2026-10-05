// Position X (bent over the table, the disciplinarian at the subject's side): it builds, the stance is the report's, the swing still lands.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.argv[2] || 'http://localhost:8765/tests/skirt.html');
  const r = await p.evaluate(() => {
    window.__keeper = 'b'; setup('red', 'x', 'hand', 'up');
    for (let i = 0; i < 30; i++) { clock += 1 / 60; ses.tick(1 / 60, clock); }
    const g = ses.giver, e = new THREE.Euler().setFromQuaternion(g.bones.pelvis.quaternion, 'YXZ');
    const pel = g.bones.pelvis.getWorldPosition(new THREE.Vector3()), n0 = ses.scn.impacts;
    ses.smack(); for (let i = 0; i < 240; i++) { clock += 1 / 60; ses.tick(1 / 60, clock); }
    return { pelvisYaw: +(e.y * 57.2958).toFixed(1), group: [g.group.position.x, g.group.position.z].map(v => +v.toFixed(3)), impacts: ses.scn.impacts - n0, position: ses.position };
  });
  console.log(JSON.stringify(r));
  const bad = [];
  if (r.pelvisYaw !== 126.5) bad.push('pelvis should be turned 126.5°');
  if (r.impacts < 1) bad.push('the smack should land');
  if (errs.length) bad.push('page errors: ' + errs[0]);
  await b.close();
  if (bad.length) { console.error('FAIL ' + bad.join('; ')); process.exit(1); }
  console.log('ok');
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
