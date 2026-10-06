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
    { who: 'giver', beat: 'contact', bones: { spine1: [-10.1, 0, 1], spine2: [1.4, -4, -0.2], neck: [6, 0, 0], upperArmL: [0, 0, 0], forearmL: [0, 0, 0], handL: [0, 0, 0], upperArmR: [0, 0, 0], forearmR: [0, 0, 0], handR: [0, 0, 0], thighL: [3.3, -1, 5.7], shinL: [19.6, -10.7, -15.5], footL: [-24.9, 2.2, 0], thighR: [3.5, -0.3, -5.5], shinR: [20.9, -3.3, -4.8], footR: [-25.4, 5.3, 16.1] } },
    { who: 'subject', beat: 'base', bones: { spine1: [-3, 0, 5.3], upperArmL: [-75, 0, -30], forearmL: [-15, 0, 0], handL: [0, 0, 0], upperArmR: [-75, 0, 30], forearmR: [-15, 0, 0], handR: [0, 0, 0] } },
    { who: 'subject', beat: 'contact', bones: { upperArmL: [-75, 0, -30], forearmL: [-15, 0, 0], handL: [0, 0, 0], upperArmR: [-75, 0, 30], forearmR: [-15, 0, 0], handR: [0, 0, 0], thighL: [-78.8, -2.2, 1.4], shinL: [14.9, 0.1, -6.9], footL: [-16.9, -1.9, 4], thighR: [-79.1, -0.1, 7], shinR: [15.3, -1.6, -6.2], footR: [-18.3, 0.1, 3.1] } },
  ],
};
})(typeof window !== 'undefined' ? window : globalThis);
