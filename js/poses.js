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
    { who: 'giver', beat: 'relaxed', bones: { pelvis: [0, 124, 0], neck: [0, 0, 0], upperArmL: [0, 0, 0], forearmL: [0, 0, 0], handL: [0, 0, 0], upperArmR: [0, 0, 0], forearmR: [0, 0, 0], handR: [0, 0, 0], thighL: [-1.1, -1.1, 4.8], shinL: [-2.3, -3.6, 0.9], footL: [2.8, 0.9, -14], thighR: [0.3, 1.5, -4.1], shinR: [-5, 3.8, 0.8], footR: [3.9, -1.8, 5.1], fingersL: [0, 0, -16], thumb2R: [0, 0, 0] } },
    { who: 'subject', beat: 'base', bones: { spine2: [-4.9, -1.4, -7.4], upperArmL: [-75, 0, -30], forearmL: [-15, 0, 0], handL: [0, 0, 0], upperArmR: [-75, 0, 30], forearmR: [-15, 0, 0], handR: [0, 0, 0], fingersL: [0, 0, -94], fingersR: [0, 0, 87], thumb2L: [-48, 0, 0] } },
  ],
};
})(typeof window !== 'undefined' ? window : globalThis);
