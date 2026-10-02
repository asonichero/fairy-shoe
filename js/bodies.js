// The Fairy Shoe — bodies. Each resident (and the player's own hands) is a Starlight preset, built from one of the engine's
// stock bodies with the measurements, colouring and clothes of the person. All adult builds.
(function (root) {
'use strict';
const S = root.Starlight;
const A = Object.assign;

const wear = (base, o) => ({ ...base, ...o });
// A look is a list of wardrobe ids, innermost first. These residents wear 'Everyday'.
const everyday = layers => ({ Underwear: layers.filter(l => l === 'bra' || l === 'briefs'), Everyday: layers });

const BODIES = {
  // Red — a bright, restless build (Kiko's), a red top over a short skirt.
  red: () => {
    const m = S.clone(S.PRESETS.kiko);
    A(m, { name: 'Red', height: 162, skin: 0xedcaa9, outfit: { hair: 0x5a1e12, hairStyle: 'ponytail', scrunchie: 0xc42b2b, bobbles: [0x5a1e12] }, youth: 0.5,
      expr: { mouthL: 0.45, mouthR: 0.35, lidUpper: 0.45, browInner: 0.1, browOuter: 0.3, saccade: 0.95, contact: 0.5, blink: 1.2 } });
    A(m.wardrobe, {
      bra: wear(m.wardrobe.bra, { name: 'Cream sports bra', color: 0xe9e0d0 }), briefs: wear(m.wardrobe.briefs, { name: 'Cream hipsters', color: 0xe9e0d0 }),
      bottom: wear(m.wardrobe.bottom, { name: 'Shorts', color: 0x6a2a24 }), skirt: wear(m.wardrobe.skirt, { name: 'Red skirt', color: 0xb02828, length: 0.2 }),
      top: wear(m.wardrobe.top, { name: 'Red hooded top', color: 0xc42b2b }), shoes: wear(m.wardrobe.shoes, { name: 'Boots', color: 0x4a2e1c }) });
    m.looks = everyday(['bra', 'briefs', 'bottom', 'skirt', 'top', 'shoes']); m.look = 'Everyday';
    return m;
  },
  // Goldilocks — a slim, long-haired build (Rin's), golden hair, a pale-blue dress in two pieces.
  goldilocks: () => {
    const m = S.clone(S.PRESETS.rin);
    A(m, { name: 'Goldilocks', height: 167, skin: 0xf0cfb0, youth: 0.45, bust: 82, underbust: 69, hip: 92, glutes: 1.3,
      outfit: { hair: 0xd9a843, hairStyle: 'long' },
      expr: { browInner: -0.1, browOuter: 0.15, lidUpper: 0.2, mouthL: 0.2, mouthR: 0.1, saccade: 0.4, contact: 0.8, blink: 0.9 } });
    A(m.wardrobe, {
      bra: wear(m.wardrobe.bra, { color: 0xf4f0e8 }), briefs: wear(m.wardrobe.briefs, { color: 0xf4f0e8 }),
      bottom: wear(m.wardrobe.bottom, { name: 'Under-shorts', color: 0xe6dccb, legLen: 0.4 }),
      skirt: { kind: 'skirt', name: 'Blue skirt', color: 0x7fa3d6, above: 0.01, length: 0.24, flare: 0.03 },
      top: { kind: 'top', name: 'Cream blouse', color: 0xf2ecdc, from: 'waist', sleeves: 0.45 }, shoes: wear(m.wardrobe.shoes, { name: 'Buckled shoes', color: 0x5a3a2a }) });
    m.looks = everyday(['bra', 'briefs', 'bottom', 'skirt', 'top', 'shoes']); m.look = 'Everyday';
    return m;
  },
  // Rapunzel — a tall, quiet build (Aya's), long fair hair, a lilac top over leggings.
  rapunzel: () => {
    const m = S.clone(S.PRESETS.aya);
    A(m, { name: 'Rapunzel', height: 174, skin: 0xf1d2b6, youth: 0.3, bust: 84, hip: 98, glutes: 1.2,
      outfit: { hair: 0xe8c872, hairStyle: 'long' },
      expr: { browInner: 0.35, browOuter: 0, gazeY: -0.12, lidUpper: -0.1, mouthL: -0.05, mouthR: -0.05, saccade: 0.5, contact: 0.3, blink: 1.0 } });
    A(m.wardrobe, {
      bra: wear(m.wardrobe.bra, { name: 'Lilac bralette', color: 0x8a78b8 }), briefs: wear(m.wardrobe.briefs, { name: 'Lilac briefs', color: 0x8a78b8, back: 'brief', thong: undefined, backCurve: 0.6, rise: 0.4, riseBack: 0.8 }),
      bottom: wear(m.wardrobe.bottom, { name: 'Leggings', color: 0x4a3f6e }), top: wear(m.wardrobe.top, { name: 'Lilac tunic', color: 0xb7a6e0, from: 'hip', sleeves: 1 }),
      shoes: wear(m.wardrobe.shoes, { name: 'Soft shoes', color: 0xd8cfe6 }) });
    delete m.wardrobe.briefs.thong;
    m.looks = everyday(['bra', 'briefs', 'bottom', 'top', 'shoes']); m.look = 'Everyday';
    return m;
  },
  // Jack — a lean, quick build (Haru's, taller), green and brown; a grin kept ready.
  jack: () => {
    const m = S.clone(S.PRESETS.haru);
    A(m, { name: 'Jack', height: 176, legs: 1.04, shoulders: 41, bust: 90, underbust: 84, waist: 74, hip: 90, neck: 34, arm: 28, forearm: 24, wrist: 16, thigh: 49, knee: 35, calf: 34, ankle: 21,
      skin: 0xe6bd98, youth: 0.2, outfit: { hair: 0x7a4a22, hairStyle: 'short' },
      expr: { mouthL: 0.55, mouthR: 0.2, lidUpper: 0.35, browInner: 0.05, browOuter: 0.25, browAsym: 0.2, saccade: 0.7, contact: 0.9, blink: 1.0 } });
    A(m.wardrobe, {
      briefs: wear(m.wardrobe.briefs, { name: 'Brown trunks', color: 0x5a4028 }), bottom: wear(m.wardrobe.bottom, { name: 'Brown trousers', color: 0x6a5232 }),
      top: wear(m.wardrobe.top, { name: 'Green shirt', color: 0x4f8a3c, from: 'hip', sleeves: 0.45 }), shoes: wear(m.wardrobe.shoes, { name: 'Boots', color: 0x3a2a1a }) });
    m.looks = everyday(['briefs', 'bottom', 'top', 'shoes']); m.look = 'Everyday';
    return m;
  },
  // Hans — a big, steady build (Kenji's); nothing in the face moves unless it has a reason.
  hans: () => {
    const m = S.clone(S.PRESETS.kenji);
    A(m, { name: 'Hans', height: 184, skin: 0xf0cdae, outfit: { hair: 0xc8b078, hairStyle: 'short' },
      expr: { gazeX: 0.05, gazeY: 0.0, squint: 0.1, lidUpper: -0.05, browInner: 0, mouthL: 0, mouthR: 0, saccade: 0.15, contact: 0.85, blink: 0.7 } });
    A(m.wardrobe, {
      briefs: wear(m.wardrobe.briefs, { name: 'Grey trunks', color: 0x55585e }), bottom: wear(m.wardrobe.bottom, { name: 'Work trousers', color: 0x4a4d52 }),
      top: wear(m.wardrobe.top, { name: 'Undyed sweater', color: 0xcfc6ae, from: 'hip', sleeves: 2 }), shoes: wear(m.wardrobe.shoes, { name: 'Boots', color: 0x2c2a26 }) });
    m.looks = everyday(['briefs', 'bottom', 'top', 'shoes']); m.look = 'Everyday';
    return m;
  },
  // Snow White — a soft, slight build (Rin's), black hair, pale skin, a yellow top and blue skirt.
  snow: () => {
    const m = S.clone(S.PRESETS.rin);
    A(m, { name: 'Snow White', height: 160, skin: 0xf6e1d2, youth: 0.5, bust: 80, underbust: 67, hip: 90, glutes: 1.35,
      outfit: { hair: 0x0e0b0c, hairStyle: 'long' },
      expr: { browInner: 0.4, browOuter: 0.1, lidUpper: 0.3, mouthL: 0.1, mouthR: 0.1, saccade: 0.5, contact: 0.7, blink: 1.0 } });
    A(m.wardrobe, {
      bra: wear(m.wardrobe.bra, { color: 0xf4f0e8 }), briefs: wear(m.wardrobe.briefs, { color: 0xf4f0e8 }),
      bottom: wear(m.wardrobe.bottom, { name: 'Under-shorts', color: 0xe8e0d0, legLen: 0.4 }),
      skirt: { kind: 'skirt', name: 'Blue skirt', color: 0x2f4d9c, above: 0.01, length: 0.26, flare: 0.03 },
      top: { kind: 'top', name: 'Yellow top', color: 0xe8c23c, from: 'waist', sleeves: 0.45 }, shoes: wear(m.wardrobe.shoes, { name: 'Little shoes', color: 0xb02828 }) });
    m.looks = everyday(['bra', 'briefs', 'bottom', 'skirt', 'top', 'shoes']); m.look = 'Everyday';
    return m;
  },
};

// The player's own hands: who they appear as, chosen on the first screen. Never named.
const KEEPERS = {
  a: { label: 'Tall, dark hair tied back', make: () => { const m = S.clone(S.PRESETS.aya); m.name = 'You'; return m; } },
  b: { label: 'Broad, short dark hair', make: () => { const m = S.clone(S.PRESETS.kenji); m.name = 'You'; return m; } },
  c: { label: 'Slight, long dark hair', make: () => { const m = S.clone(S.PRESETS.rin); m.name = 'You'; return m; } },
  d: { label: 'Slim, short brown hair', make: () => { const m = S.clone(S.PRESETS.haru); m.name = 'You'; return m; } },
};

root.FairyShoeBodies = { BODIES, KEEPERS, spec: id => BODIES[id](), keeper: k => (KEEPERS[k] || KEEPERS.a).make() };
})(window);
