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
  corner: [], lines: [], held: [], warm: [],
  // Editor-only base position ("Hips"): bent at the hips, arms forward; the game never offers it.
  // Editor-only base position ("Astride"): the lap scene, seated, with its own poses; the game never offers it.
  astride: [
    { who: 'subject', beat: 'base', bones: { pelvis: [0, 108.5, -88.5], upperArmL: [-75, 0, -30], forearmL: [-15, 0, 0], handL: [0, 0, 0], upperArmR: [-75, 0, 30], forearmR: [-15, 0, 0], handR: [0, 0, 0], thighL: [-6.6, -8.8, 30.2], shinL: [28.8, 1.4, -33.1], footL: [5, 0.5, 36.2], spine1: [10.7, 0.7, 0.2], spine2: [25.1, 0.5, -2], neck: [25.5, 1.1, 6.8], thighR: [-30.2, -39.7, -12.4], shinR: [42.2, 22.6, 1.8], footR: [-3, 12.5, 9.9], fingersL: [0, 0, -48], fingersR: [0, 0, 41] } },
    { who: 'giver', beat: 'relaxed', bones: { pelvis: [-29.5, 0, 0], neck: [6, 0, 0], head: [0, 0, 0], upperArmL: [0, 0, 0], forearmL: [0, 0, 0], handL: [0, 0, 0], upperArmR: [0, 0, 0], forearmR: [0, 0, 0], handR: [0, 0, 0], thighL: [-56.8, -1.3, -2.6], shinL: [72.2, -2, -3.4], footL: [14.3, -1.2, 3.4], thighR: [-55.3, 1.1, 2.3], shinR: [69.9, 2.9, 3.1], footR: [14, 1.1, -2.2] } },
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
