// The Fairy Shoe — editor setup. The character viewer's UI (editor.html) works on S.PRESETS and S.ORDER; here they are replaced with
// the game's cast (the six residents, and the four looks the player can have), built the way the game builds them. The built-in design
// is kept apart so “reset” and “save” know what a change is a change from, and the furniture, pose edits and held hands of the game's own
// scene are exposed for the viewer's discipline scene to use.
(function () {
'use strict';
const S = window.Starlight, B = window.FairyShoeBodies, C = window.FairyShoeContent, SC = window.FairyShoeScene, Ov = window.FairyShoeOverrides;
Ov.load();

const builtIn = {};
for (const id of C.ORDER) builtIn[id] = B.BODIES[id]();
for (const [k, v] of Object.entries(B.KEEPERS)) { const m = v.make(); m.name = 'You (' + v.label.split(',')[0].toLowerCase() + ')'; builtIn['keeper-' + k] = m; }
for (const k of Object.keys(S.PRESETS)) delete S.PRESETS[k];
S.ORDER.length = 0;
for (const [id, spec] of Object.entries(builtIn)) { S.PRESETS[id] = spec; S.ORDER.push(id); }

// The viewer's position ids are the engine's; the game (and the saved pose edits) call 'knees' 'chair'.
const gamePos = p => p === 'knees' ? 'chair' : p;
window.EDITOR = {
  Ov, builtIn, gamePos,
  initial: id => Ov.applyDesign(S.clone(S.PRESETS[id]), id),
  seatTop: g => SC.chairSeatTop(g),
  furnish: (parent, scn, s, pos, seatTop) => SC.furnishScene(parent, scn, s, gamePos(pos), seatTop),
  poses: (scn, pos) => SC.applyPoseOverrides(scn, gamePos(pos)),
  hold: (s, plant) => SC.holdChairHands(s, plant),
};
})();
