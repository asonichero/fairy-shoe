'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/rules.js');
const C = require('../js/content.js');

const rng = (seed = 1) => R.mulberry32(seed);
const house = (ids, seed = 1) => {
  const g = R.newGame(rng(seed));
  g.roster = ids.slice(); g.unseen = C.ORDER.filter(i => !ids.includes(i));
  for (const id of ids) g.chars[id] = { stats: { ...C.CHARACTERS[id].base }, carry: {}, visits: 1, moveOns: 0 };
  return g;
};

test('a new game seats exactly three distinct residents', () => {
  for (let s = 1; s < 30; s++) { const g = R.newGame(rng(s)); assert.equal(g.roster.length, 3); assert.equal(new Set(g.roster).size, 3); }
});

test('effective attention: arrivals are not taxed on day one, drift is', () => {
  for (const id of C.ORDER) assert.ok(R.effectiveAttention(C.CHARACTERS[id].base).mod >= -1, id);
  assert.equal(R.effectiveAttention({ wil: 7, att: 4, res: 7, sat: 1, val: 1, com: 1 }).mod, -3);
  assert.equal(R.effectiveAttention({ wil: 1, att: 7, res: 1, sat: 7, val: 7, com: 7 }).value, 7);
  assert.equal(R.effectiveAttention({ wil: 1, att: 4, res: 1, sat: 7, val: 7, com: 7 }).mod, 2);
});

test('chore bands follow the difficulty tables', () => {
  assert.equal(R.choreBand(1, 5), 'well'); assert.equal(R.choreBand(1, 3), 'completed'); assert.equal(R.choreBand(1, 2), 'partial'); assert.equal(R.choreBand(1, 1), 'failed');
  assert.equal(R.choreBand(2, 6), 'well'); assert.equal(R.choreBand(2, 5), 'completed'); assert.equal(R.choreBand(2, 3), 'partial');
  assert.equal(R.choreBand(3, 7), 'well'); assert.equal(R.choreBand(3, 6), 'completed'); assert.equal(R.choreBand(3, 4), 'partial'); assert.equal(R.choreBand(3, 2), 'failed');
});

test('the chore list has one slot per resident, and every slot can be filled', () => {
  for (let s = 1; s < 60; s++) {
    const g = house(['red', 'jack', 'snow'], s); R.startMorning(g, rng(s));
    assert.equal(g.chores.reduce((n, c) => n + c.slots.length, 0), 3);
    assert.equal(new Set(g.chores.map(c => c.id)).size, g.chores.length);
    assert.ok(!R.allAssigned(g));
    const slots = []; g.chores.forEach((c, i) => c.slots.forEach((_, j) => slots.push([i, j])));
    g.roster.forEach((id, k) => R.assign(g, slots[k][0], slots[k][1], id));
    assert.ok(R.allAssigned(g));
  }
});

test('assigning a resident moves them rather than duplicating them', () => {
  const g = house(['red', 'jack', 'snow']); R.startMorning(g, rng(3));
  R.assign(g, 0, 0, 'red'); R.assign(g, 1, 0, 'red');
  assert.equal(g.chores[0].slots[0], null); assert.equal(g.chores[1].slots[0], 'red');
});

test('failed chores cost attention and satisfaction; completed ones build attention', () => {
  const g = house(['red', 'jack', 'snow']);
  R.applyChoreBand(g, 'red', 'failed', 2); assert.deepEqual([g.chars.red.stats.att, g.chars.red.stats.sat], [1, 3]);
  R.applyChoreBand(g, 'jack', 'completed', 1); assert.equal(g.chars.jack.stats.att, 4);
  R.applyChoreBand(g, 'jack', 'well', 1); assert.equal(g.chars.jack.stats.sat, 5);          // difficulty 1: no satisfaction
  R.applyChoreBand(g, 'jack', 'well', 3); assert.equal(g.chars.jack.stats.sat, 6);
  const before = { ...g.chars.snow.stats }; R.applyChoreBand(g, 'snow', 'partial', 3); assert.deepEqual(g.chars.snow.stats, before);
});

test('occurrence chance is clamped to 5–70', () => {
  assert.equal(R.occurrence({ wil: 1, res: 1, sat: 7, com: 7 }), 5);
  assert.equal(R.occurrence({ wil: 7, res: 7, sat: 1, com: 1 }), 69); assert.equal(R.occurrence({ wil: 7, res: 7, sat: 0, com: 0 }), 70);
  assert.equal(R.occurrence({ wil: 4, res: 1, sat: 4, com: 2 }), 5 + 25 - 18);
});

test('at most two events, on two different people', () => {
  for (let s = 1; s < 200; s++) {
    const g = house(['jack', 'goldilocks', 'rapunzel'], s);
    for (const id of g.roster) { g.chars[id].stats.wil = 7; g.chars[id].stats.res = 7; g.chars[id].stats.sat = 1; g.chars[id].stats.com = 1; }
    const ev = R.rollEvents(g, rng(s));
    assert.ok(ev.length <= 2); assert.equal(new Set(ev.map(e => e.id)).size, ev.length);
  }
});

test('cruelty and friction need somebody to name; with nobody it falls back', () => {
  const g = house(['jack']); g.chars.jack.stats.res = 7;
  const w = R.categoryWeights(g, 'jack', false);
  assert.equal(w.friction, 0); assert.equal(w.cruelty, 0);
  const g2 = house(['jack', 'red']); g2.chars.jack.stats.res = 4;
  assert.equal(R.categoryWeights(g2, 'jack', true).cruelty, 0);
  g2.chars.jack.stats.res = 5; assert.ok(R.categoryWeights(g2, 'jack', true).cruelty > 0);
});

test('every event template fills cleanly and capitalises pronouns by position', () => {
  const ctx = { name: 'Jack', pron: ['he', 'him', 'his', 'himself'], second: 'Red', title: 'Ma\'am' };
  for (const [cat, list] of Object.entries(C.EVENTS)) for (const t of list) {
    const text = R.fillTemplate(typeof t === 'string' ? t : t.text, ctx);
    assert.ok(!/\{\w+\}/.test(text), cat + ': ' + text);
    assert.ok(!/(^|[.!?] )(he|him|his) /.test(text), 'sentence-initial pronoun not capitalised: ' + text);
  }
  assert.equal(R.fillTemplate('{Subj} said {Subj} was fine.', ctx), 'He said he was fine.');
});

test('the situational modifier stacks and caps at +2', () => {
  assert.equal(R.situationalModifier({ band: 'completed', event: null }), 0);
  assert.equal(R.situationalModifier({ band: 'partial', event: null }), 1);
  assert.equal(R.situationalModifier({ band: 'failed', event: { mod: 1 } }), 2);
  assert.equal(R.situationalModifier({ band: 'failed', event: { mod: 2 } }), 2);
  assert.equal(R.situationalModifier({ band: 'completed', event: { mod: 1 } }), 1);
});

test('expected band follows Wilfulness, shifts up with trouble, saturates at Severe; traps want a gentle hand', () => {
  const at = (wil, mod, ev) => R.expectedBand({ wil }, { mod, event: ev || null });
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(w => at(w, 0)), [0, 1, 1, 2, 2, 3, 3]);
  assert.equal(at(4, 1), 3); assert.equal(at(7, 1), 4); assert.equal(at(7, 2), 4);
  assert.equal(at(7, 2, { trap: true }), 0);
});

test('reached bands and match quality', () => {
  assert.deepEqual([0, 0.19, 0.2, 0.54, 0.55, 0.89, 0.9, 1.19, 1.2, 1.49, 1.5].map(R.reachedBand), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  assert.equal(R.matchQuality(2, 2), 'well'); assert.equal(R.matchQuality(1, 2), 'under1'); assert.equal(R.matchQuality(0, 2), 'under2');
  assert.equal(R.matchQuality(3, 2), 'over1'); assert.equal(R.matchQuality(4, 2), 'over2'); assert.equal(R.matchQuality(0, 0, true), 'over2');
});

function withCard(g, id, card) { g.cards = [{ id, band: 'completed', event: null, mod: 0, done: false, ...card }]; g.phase = 'evening'; }

test('a well-matched correction settles the resident; with Valued low it does not cut Resentment', () => {
  const g = house(['red', 'jack', 'snow']); withCard(g, 'red', {});
  g.chars.red.stats.val = 3; g.chars.red.stats.res = 2;
  const r = R.applyCorrection(g, 'red', { peak: 0.7 });   // Red wil 4 → Moderate; peak .7 → Moderate
  assert.equal(r.quality, 'well');
  assert.deepEqual([g.chars.red.stats.wil, g.chars.red.stats.res, g.chars.red.stats.val], [3, 3, 4]);
});

test('overshoot costs resentment; far overshoot costs trust; too harsh with thin trust is the word', () => {
  const g = house(['jack', 'goldilocks', 'snow']); withCard(g, 'goldilocks', {});
  const r = R.applyCorrection(g, 'goldilocks', { peak: 1.3 });
  assert.equal(r.quality, 'over2'); assert.equal(g.chars.goldilocks.stats.res, 4); assert.equal(g.chars.goldilocks.stats.val, 1);
  const g2 = house(['jack', 'goldilocks', 'snow']); withCard(g2, 'goldilocks', {});
  const r2 = R.applyCorrection(g2, 'goldilocks', { peak: 1.6, tooHarsh: true });
  assert.ok(r2.word); assert.ok(!g2.roster.includes('goldilocks')); assert.ok(g2.unseen.includes('goldilocks'));
  assert.deepEqual(g2.chars.goldilocks.stats, C.CHARACTERS.goldilocks.base);
});

test('too harsh with trust intact is a heavy overshoot but not the word', () => {
  const g = house(['jack', 'red', 'snow']); withCard(g, 'jack', {});
  g.chars.jack.stats.val = 6; g.chars.jack.stats.res = 2;
  const r = R.applyCorrection(g, 'jack', { peak: 1.6, tooHarsh: true });
  assert.ok(!r.word); assert.ok(g.roster.includes('jack')); assert.equal(g.chars.jack.stats.val, 5);
});

test('undershooting by two bands costs composure only', () => {
  const g = house(['jack', 'red', 'snow']); withCard(g, 'jack', {});
  const before = { ...g.chars.jack.stats }; R.applyCorrection(g, 'jack', { peak: 0 });
  assert.deepEqual(Object.fromEntries(Object.keys(before).map(k => [k, g.chars.jack.stats[k] - before[k]])), { wil: 0, att: 0, res: 0, sat: 0, val: 0, com: -1 });
});

test('Hans: the Wilfulness he sheds from correction is halved', () => {
  const g = house(['hans', 'red', 'snow']); withCard(g, 'hans', {}); g.chars.hans.stats.wil = 4;
  R.applyCorrection(g, 'hans', { peak: 0.7 });   // well matched: wil −1 → half → stays; the carry pays out next time
  assert.equal(g.chars.hans.stats.wil, 4);
  R.changeStat(g, 'hans', 'wil', -1, 'correction'); assert.equal(g.chars.hans.stats.wil, 3);
  R.changeStat(g, 'hans', 'wil', -1, 'event');       assert.equal(g.chars.hans.stats.wil, 2);   // other sources are not damped
});

test('Jack shrugs off a small overshoot while he still feels valued; Red does not', () => {
  const g = house(['jack', 'red', 'snow']); withCard(g, 'jack', {}); g.chars.jack.stats.wil = 5; g.chars.jack.stats.val = 4;   // expects Moderate (2)
  const r = R.applyCorrection(g, 'jack', { peak: 1.0 });   // Firm: one over
  assert.equal(r.quality, 'over1'); assert.equal(g.chars.jack.stats.res, 1);
  const g2 = house(['jack', 'red', 'snow']); withCard(g2, 'red', {}); g2.chars.red.stats.val = 3;
  const v0 = g2.chars.red.stats.val; R.applyCorrection(g2, 'red', { peak: 1.0 });
  assert.equal(g2.chars.red.stats.val, v0 - 1);
});

test('Snow White: Valued swings double, Satisfaction moves slowly', () => {
  const g = house(['snow', 'red', 'jack']);
  R.changeStat(g, 'snow', 'val', -1, 'event'); assert.equal(g.chars.snow.stats.val, 2);
  R.changeStat(g, 'snow', 'sat', 1, 'event'); assert.equal(g.chars.snow.stats.sat, 2);
  R.changeStat(g, 'snow', 'sat', 1, 'event'); assert.equal(g.chars.snow.stats.sat, 3);
});

test('moving on is found on any stat change, removes the resident, and is permanent', () => {
  const g = house(['goldilocks', 'red', 'jack']); g.chars.goldilocks.stats.wil = 3; g.chars.goldilocks.stats.val = 4; g.chars.goldilocks.stats.att = 3;
  R.applyChoreBand(g, 'goldilocks', 'completed', 1);   // attention 3 → 4
  const out = R.sweepMoveOns(g);
  assert.equal(out.length, 1); assert.ok(!g.roster.includes('goldilocks')); assert.deepEqual(g.collection, ['goldilocks']);
});

test('backfill: unseen first, then graduates return as fresh arrivals; the collection stays unique', () => {
  const g = house(['red', 'jack', 'snow']);
  g.unseen = ['goldilocks'];
  R.moveOn(g, 'red'); g.leftToday = [];
  R.backfill(g, rng(1)); assert.deepEqual(g.roster.slice().sort(), ['goldilocks', 'jack', 'snow']);
  // everything has been through: the unseen pool is empty, graduates cycle back
  g.unseen = []; g.chars.red.stats.wil = 1;
  R.moveOn(g, 'jack'); g.leftToday = [];
  const arrived = R.backfill(g, rng(2));
  assert.equal(g.roster.length, 3); assert.ok(arrived.length === 1);
  assert.deepEqual(g.chars[arrived[0]].stats, C.CHARACTERS[arrived[0]].base);
  assert.equal(new Set(g.collection).size, g.collection.length);
});

test('someone who just left is not drawn straight back', () => {
  for (let s = 1; s < 40; s++) {
    const g = house(['red', 'jack', 'snow'], s); g.unseen = ['goldilocks', 'hans'];
    R.useWord(g, 'red', 'worn');   // red goes back to the pool, alongside the other two
    R.backfill(g, rng(s)); assert.ok(!g.roster.includes('red'));
  }
});

test('the word at the day boundary: Resentment 7 and Valued 2, together', () => {
  const g = house(['red', 'jack', 'snow']); g.unseen = ['goldilocks', 'hans', 'rapunzel'];
  g.chars.red.stats.res = 7; g.chars.red.stats.val = 3; g.chars.jack.stats.res = 7; g.chars.jack.stats.val = 2; withCard(g, 'red', { done: true });
  R.endEvening(g, rng(5));
  assert.ok(g.roster.includes('red')); assert.ok(!g.roster.includes('jack')); assert.equal(g.roster.length, 3);
  assert.deepEqual(g.chars.jack.stats, C.CHARACTERS.jack.base); assert.ok(g.unseen.includes('jack'));
});

test('reprieves and aftercare spend the evening candle and cannot be bought past it', () => {
  const g = house(['red', 'jack', 'snow']); withCard(g, 'red', {});
  assert.ok(R.applyReprieve(g, 'red', 'kind')); assert.equal(g.candle, R.EVENING_CANDLE - 2);
  assert.ok(R.applyAftercare(g, 'red', 'held')); assert.equal(g.candle, 1);
  assert.equal(R.applyAftercare(g, 'red', 'held'), null);
  assert.ok(R.applyAftercare(g, 'red', 'warm')); assert.equal(g.candle, 0);
  assert.equal(R.applyReprieve(g, 'red', 'stern'), null);
});

test('a kind word is what the trap variants need; Goldilocks reads a reprieve as no consequence', () => {
  const g = house(['red', 'jack', 'snow']); withCard(g, 'red', { event: { trap: true, mod: 1, cat: 'dishonest' } });
  const s0 = g.chars.red.stats.sat; R.applyReprieve(g, 'red', 'kind'); assert.equal(g.chars.red.stats.sat, s0 + 2);
  const g2 = house(['goldilocks', 'jack', 'snow']); withCard(g2, 'goldilocks', {});
  R.applyReprieve(g2, 'goldilocks', 'stern'); assert.equal(g2.chars.goldilocks.stats.wil, 4);   // −1 then +1
});

test('Rapunzel only moves on through Valued', () => {
  const g = house(['rapunzel', 'red', 'jack']); const s = g.chars.rapunzel.stats;
  Object.assign(s, { wil: 1, att: 7, res: 1, sat: 7, val: 4, com: 7 }); assert.ok(!R.meetsGraduation('rapunzel', s));
  s.val = 5; assert.ok(R.meetsGraduation('rapunzel', s));
});

test('a whole simulated run never strands the house, and every day resolves', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const r = rng(seed), g = R.newGame(r);
    for (let day = 0; day < 60; day++) {
      R.startMorning(g, r); assert.equal(g.roster.length, 3, 'seed ' + seed + ' day ' + day);
      let k = 0; const order = R.shuffle(r, g.roster);
      g.chores.forEach((c, i) => c.slots.forEach((_, j) => R.assign(g, i, j, order[k++])));
      assert.ok(R.allAssigned(g));
      R.resolveDay(g, r);
      for (const card of R.pendingCards(g).slice()) {
        if (!g.roster.includes(card.id)) continue;
        const roll = r();
        if (roll < 0.15) R.applyReprieve(g, card.id, ['stern', 'kind', 'reflection'][Math.floor(r() * 3)]);
        else R.applyCorrection(g, card.id, { peak: r() * 1.7, tooHarsh: r() < 0.03 });
        if (g.roster.includes(card.id) && r() < 0.5) R.applyAftercare(g, card.id, ['corner', 'lines', 'held', 'warm'][Math.floor(r() * 4)]);
      }
      R.endEvening(g, r);
      for (const id of g.roster) for (const k2 of C.STATS) assert.ok(g.chars[id].stats[k2] >= 1 && g.chars[id].stats[k2] <= 7);
    }
    assert.equal(new Set(g.collection).size, g.collection.length);
  }
});

test('a save survives JSON', () => {
  const g = house(['red', 'jack', 'snow']); R.startMorning(g, rng(2));
  const g2 = JSON.parse(JSON.stringify(g)); assert.deepEqual(g2, g);
  R.assign(g2, 0, 0, 'red');   // still playable
});

test('farewell scenes: every resident, both kinds, every mood, filled and with a choice', () => {
  for (const id of C.ORDER) for (const kind of ['moveon', 'word']) for (const mood of ['willing', 'sullen', 'cheeky', 'flustered', 'plain']) for (const why of ['harsh', 'worn']) {
    const beats = R.farewellScene(kind, id, { why, mood, title: 'Ma\'am' });
    assert.ok(beats.some(b => b.ask && b.ask.length === 3), id + kind);
    const text = JSON.stringify(beats);
    assert.ok(!/\{\w+\}/.test(text), id + ' ' + kind + ' ' + mood + ': ' + (text.match(/\{\w+\}/) || [])[0]);
    assert.ok(/Ma'am/.test(text) || kind === 'moveon' || kind === 'word');
  }
});

test('the word notice carries how they were, captured before the reset', () => {
  const g = house(['jack', 'red', 'snow']); g.chars.jack.stats.res = 7; g.chars.jack.stats.val = 2;
  const n = R.useWord(g, 'jack', 'worn');
  assert.equal(n.mood, 'sullen'); assert.deepEqual(g.chars.jack.stats, C.CHARACTERS.jack.base);
});
