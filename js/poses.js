// The Fairy Shoe — pose edits: bones of the discipline scene's poses that are set by hand rather than by the engine's pose tables.
// One list per position; an entry names whose pose it is (who: 'subject' or 'giver' — the player), at which beat (the subject's 'base'
// resting pose and what it blends toward when struck, 'contact'; the player's 'relaxed', 'raised' and 'contact'), and the bones it sets, as
// local Euler angles in degrees [x, y, z] (order YXZ, the pose tables' convention). The character editor prints a report in exactly this
// form (Pose editor ▸ Report, then the Report section): paste its entries here. Nothing else writes to this file.
(function (root) {
'use strict';
root.FairyShoePoses = {
  lap: [],
  case: [],
  head: [],
  chair: [],
  spread: [],
  // The aftercare scenes (corner, lines, held, warm): bones set on top of each scene's own standing or seated pose (who: 'subject' or 'giver', beat: 'base').
  corner: [], warm: [], heldalt: [],
  lines: [
    { who: 'subject', beat: 'base', bones: { neck: [25.9, 0.1, -0.4], upperArmL: [-53.7, 96.4, -88.9], forearmL: [-6.6, -65.7, -70.8], handL: [28.6, -62.2, -12.7], upperArmR: [-38.8, -94.6, 97.3], forearmR: [-28.2, 86, 89.3], handR: [52.9, 6.2, -4.7], fingersR: [0, 0, -7], thumbR: [-25.5, 0, 0] } },
  ],
  held: [
    { who: 'giver', beat: 'relaxed', bones: { upperArmL: [22.1, -46.1, -5.3], forearmL: [-70.5, 99.5, -139.2], handL: [14.4, -42, -5.5], upperArmR: [-27.1, 43.1, 22.7], forearmR: [15, -82.1, 147.5], handR: [67.5, -128, -167.5] } },
    { who: 'subject', beat: 'base', bones: { spine1: [9.6, 1, 5.7], spine2: [19, 16.9, 0.5], neck: [5.4, -54.1, -2.4], head: [5.5, -50.5, 0], clavL: [10, -16.8, 17.8], upperArmL: [-53.8, 151.6, -125.6], forearmL: [21.1, -11.4, -123.6], handL: [14, -26.5, -18.5], clavR: [9.6, 13.6, -28.2], upperArmR: [-16.1, -64.7, 83.6], forearmR: [-58.5, -40.5, 147.6], handR: [-18.2, 11.5, 28.9], thighL: [1.3, 0, -3.8], shinL: [-2.1, -0.4, 0.4], footL: [3.8, 0.2, 0.5], thighR: [2, 0, -0.6], shinR: [-5.3, 0.5, -0.3], footR: [5.3, -0.3, 3.9] } },
  ],
  // Editor-only base position ("Hips"): bent at the hips, arms forward; the game never offers it.
  // Editor-only base position ("Astride"): the lap scene, seated, with its own poses; the game never offers it.
  // Astride is laid out in code (setupAstride in scene.js: the hips, legs and the reach of the arms); these edits go on top, the same at every beat.
  astride: [
    { who: 'giver', beat: 'relaxed', bones: { upperArmL: [0, 0, 0], forearmL: [0, 0, 0], handL: [0, 0, 0], upperArmR: [0, 0, 0], forearmR: [0, 0, 0], handR: [0, 0, 0], fingersL: [0, 0, -48], fingersR: [0, 0, 16] } },
    { who: 'subject', beat: 'base', bones: { upperArmL: [-3, 0, -35], forearmL: [-20, 0, 0], handL: [0, 0, 0], upperArmR: [-3, 0, 35], forearmR: [-20, 0, 0], handR: [0, 0, 0], fingersL: [0, 0, -50.5], fingersR: [0, 0, 56.5] } },
  ],
  hips: [
    { who: 'giver', beat: 'contact', bones: { spine1: [-10.1, 0, 1], upperArmL: [0, 0, 0], forearmL: [0, 0, 0], handL: [0, 0, 0], upperArmR: [0, 0, 0], forearmR: [0, 0, 0], handR: [0, 0, 0], thighL: [3.3, -1, 5.7], shinL: [19.6, -10.7, -15.5], footL: [-24.9, 2.2, 0], thighR: [3.5, -0.3, -5.5], shinR: [20.9, -3.3, -4.8], footR: [-25.4, 5.3, 16.1], fingersR: [0, 0, 16] } },
    { who: 'subject', beat: 'contact', bones: { spine1: [-19.2, 0, -0.6], neck: [-54.2, -0.3, 0.8], upperArmL: [-75, 0, -30], forearmL: [-15, 0, 0], handL: [0, 0, 0], upperArmR: [-75, 0, 30], forearmR: [-15, 0, 0], handR: [0, 0, 0], thighL: [-78.8, -2.2, 1.4], shinL: [14.9, 0.1, -6.9], footL: [-17.3, -0.1, -3.1], thighR: [-79.1, -0.1, 7], shinR: [15.3, -1.6, -6.2], footR: [-18, 2, -3.9], fingersL: [0, 0, -114], fingersR: [0, 0, 105.5] } },
    { who: 'giver', beat: 'raised', bones: { spine1: [12, 0, 0], upperArmL: [0, 0, 0], forearmL: [0, 0, 0], handL: [0, 0, 0], upperArmR: [0, 0, 0], forearmR: [0, 0, 0], handR: [0, 0, 0], thighR: [-3.6, 2, -6.3], shinR: [-1.7, 3.5, -0.1], footR: [4.7, -1.6, 14.6] } },
    { who: 'subject', beat: 'base', bones: { clavL: [2.8, -5.1, 13], upperArmL: [-75, 0, -30], forearmL: [-15, 0, 0], handL: [0, 0, 0], clavR: [4.3, 7.6, -17.6], upperArmR: [-75, 0, 30], forearmR: [-15, 0, 0], handR: [0, 0, 0], fingersL: [0, 0, -93], fingersR: [0, 0, 88.5] } },
    { who: 'giver', beat: 'relaxed', bones: { thighR: [-1.5, 0.9, -6.1], shinR: [-2, -2.4, -0.3], footR: [2.9, 5.2, 14.8] } },
  ],
};
})(typeof window !== 'undefined' ? window : globalThis);
