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
  // Editor-only base position ("Hips"): bent at the hips, arms forward; the game never offers it.
  hips: [
    { who: 'giver', beat: 'relaxed', bones: { thighL: [-1.3, -3.8, 1.1], shinL: [-1.8, -14.2, -1], footL: [2.5, 14.4, -7.9], thighR: [-1.4, 0.9, -6.1], shinR: [-2.4, -2.4, -0.3], footR: [3, 5.2, 14.9] } },
    { who: 'giver', beat: 'raised', bones: { spine1: [12, 0, 0], upperArmL: [0, 0, 0], forearmL: [0, 0, 0], handL: [0, 0, 0], upperArmR: [0, 0, 0], forearmR: [0, 0, 0], handR: [0, 0, 0], thighL: [-3.8, -1.3, 0.6], footL: [5.4, 1.2, -8.9], thighR: [-3.4, 2, -6.3], shinR: [-2, 3.5, 0], footR: [4.9, -1.6, 14.5] } },
    { who: 'giver', beat: 'contact', bones: { spine1: [4.1, 0, -0.4], spine2: [-2.4, -4.1, 1.5], neck: [6, 0, 0], head: [0, 0, 0], upperArmL: [0, 0, 0], forearmL: [0, 0, 0], handL: [0, 0, 0], upperArmR: [0, 0, 0], forearmR: [0, 0, 0], handR: [0, 0, 0], thighL: [11.1, -0.5, 0], footL: [-9.4, 0.3, -7.5], thighR: [11.3, -0.3, -6.4], shinR: [-2, 3.3, 0], footR: [-9.9, -0.6, 13.9] } },
    { who: 'subject', beat: 'base', bones: { spine1: [-3, 0, 5.3], upperArmL: [-75, 0, -30], forearmL: [-15, 0, 0], handL: [0, 0, 0], upperArmR: [-75, 0, 30], forearmR: [-15, 0, 0], handR: [0, 0, 0] } },
    { who: 'subject', beat: 'contact', bones: { upperArmL: [-75, 0, -30], forearmL: [-15, 0, 0], handL: [0, 0, 0], upperArmR: [-75, 0, 30], forearmR: [-15, 0, 0], handR: [0, 0, 0], thighL: [-73.6, -1.1, -3.3], shinL: [-2.3, 0, -0.4], footL: [-5.1, -0.4, 0.8], thighR: [-73.6, 0.9, 2.7], shinR: [-2.3, 0, -0.4], footR: [-6.1, 0.2, 0.8] } },
  ],
};
})(typeof window !== 'undefined' ? window : globalThis);
