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
    { who: 'giver', beat: 'relaxed', bones: { spine1: [16, 0, 0], upperArmL: [0, 0, 0], forearmL: [0, 0, 0], handL: [0, 0, 0], upperArmR: [0, 0, 0], forearmR: [0, 0, 0], handR: [0, 0, 0], thighL: [-2.4, -0.8, 4.3], shinL: [-2.8, -3.7, 1.5], footL: [0.8, 0.9, -11.1], thighR: [-1.7, 1.8, -4.5], shinR: [-4.9, 3.6, 1], footR: [14, -8.5, 5.4] } },
    { who: 'subject', beat: 'base', bones: { spine1: [-3, 0, 5.3], upperArmL: [-75, 0, -30], forearmL: [-15, 0, 0], handL: [0, 0, 0], upperArmR: [-75, 0, 30], forearmR: [-15, 0, 0], handR: [0, 0, 0] } },
  ],
};
})(typeof window !== 'undefined' ? window : globalThis);
