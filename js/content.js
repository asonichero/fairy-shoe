// The Fairy Shoe — content: the cast, the chores, the event templates and the lines people say.
// Pure data, no DOM and no three.js, so the rules (and their tests) can run in Node.
//
// Everyone in the house is an adult (18+) who came in of their own accord, knowing what the house is
// for and what happens in it. `{Title}` is whatever the player asked to be called; the player is
// otherwise only ever "you".
(function (root) {
'use strict';

const STATS = ['wil', 'att', 'res', 'sat', 'val', 'com'];
const STAT_NAMES = { wil: 'Wilfulness', att: 'Attention', res: 'Resentment', sat: 'Satisfaction', val: 'Valued', com: 'Composure' };
const STAT_HINTS = {
  wil: 'defiance; the higher it is, the firmer a hand it takes',
  att: 'how well the work gets done',
  res: 'grievance; escalation risk',
  sat: 'day-to-day contentment; low means acting out',
  val: 'trust that a correction comes from care',
  com: 'whether a lesson lands and lasts',
};

// ── The cast ────────────────────────────────────────────────────
// base: starting spread (the spread a returning resident, or one who used the word, is reset to).
// grad: what must hold, all at once, for them to move on. Never shown to the player.
// pain: how they take correction (the engine's tolerance / resilience, 0–1).
// traits: how the rules bend for them (see rules.js changeStat).
// bias: multipliers on the event categories they drift toward.
const CHARACTERS = {
  red: {
    id: 'red', name: 'Red', age: 22, pronouns: ['she', 'her', 'her', 'herself'],
    tagline: 'Never met the wolf.',
    story: 'Nobody told Red about the wood, so nobody told her about the wolf. She kept to the path, got to her grandmother\'s in good time, and learned nothing from it at all except that the world is mostly flowers. She has been distracted and impulsive and cheerfully unhurt ever since, and at twenty-two the grown-up world of rent and deadlines has run out of patience with her. She read the house rules twice, signed beneath the word, and walked in on her own feet.',
    base: { wil: 4, att: 2, res: 1, sat: 4, val: 3, com: 2 },
    grad: [['wil', '<=', 2], ['res', '<=', 1], ['val', '>=', 5], ['com', '>=', 4]],
    pain: { tolerance: 0.4, resilience: 0.5 },
    traits: [],
    note: 'Needs to trust you before the behaviour follows. Over-correction reads as being sent away, not as discipline.',
    bias: {},
    lines: {
      open: ['"Is this going to take long, {Title}? Only I had a thought about the hens."', '"Right. Yes. I\'m listening. I\'m mostly listening."'],
      arrive: '"Hello! I\'m Red. I\'m not actually sure how I got here, but I read the rules, and I mean them."',
      leave: '"I stayed on the path the whole way, {Title}. Look — I didn\'t even stop for the flowers."',
    },
  },
  goldilocks: {
    id: 'goldilocks', name: 'Goldilocks', age: 24, pronouns: ['she', 'her', 'her', 'herself'],
    tagline: 'Nobody ever came home.',
    story: 'The bears never came back early. Goldilocks ate the porridge, tried the chairs, broke one, slept in the smallest bed, and woke to find the house just as she had left it — nothing changed, nobody cross, no one to say it had mattered. She has been trying other people\'s houses ever since and finding fault with each of them. She came to the Fairy Shoe to see whether anywhere had a rule she could not talk her way around, and she knows what it costs to find out.',
    base: { wil: 4, att: 3, res: 2, sat: 4, val: 2, com: 1 },
    grad: [['wil', '<=', 3], ['att', '>=', 4], ['val', '>=', 4]],
    pain: { tolerance: 0.5, resilience: 0.5 },
    traits: [],
    note: 'Entitled rather than malicious. Needs consistency, not softness; a reprieve early on reads as no consequence at all.',
    bias: { boundary: 1.3 },
    lines: {
      open: ['"Fine. But I\'ll say now that the chair isn\'t right."', '"Go on, then, {Title}. Let\'s see if this one\'s just right."'],
      arrive: '"I\'ve tried a lot of places. This is the first one that wrote its rules down first."',
      leave: '"It was just right, {Title}. Don\'t let anyone move the chairs."',
    },
  },
  rapunzel: {
    id: 'rapunzel', name: 'Rapunzel', age: 26, pronouns: ['she', 'her', 'her', 'herself'],
    tagline: 'The prince never came.',
    story: 'No prince ever climbed the tower, so Rapunzel cut her own hair and left it, and then she kept leaving: from one kind stranger to the next, into one unsafe room after another, because nobody had ever taught her how a person looks after herself. She looks nearly finished and is nothing of the kind. She came to the Fairy Shoe having decided, for once, to ask for something.',
    base: { wil: 2, att: 5, res: 4, sat: 2, val: 1, com: 3 },
    grad: [['val', '>=', 5]],
    pain: { tolerance: 0.35, resilience: 0.35 },
    traits: [],
    note: 'A trap: low Wilfulness hides high Resentment. Looks nearly done, isn\'t. Nothing clears her but being valued.',
    bias: { neglect: 2.5 },
    lines: {
      open: ['"I\'ll do whatever you think is right, {Title}." (It is not an answer. She knows it is not an answer.)', '"You don\'t have to be gentle, {Title}. I\'d just like it to count."'],
      arrive: '"I\'m Rapunzel. I\'m — I\'ve been told I\'m very good at being no trouble."',
      leave: '"Nobody climbed up, {Title}. I walked down. I think that was the point all along."',
    },
  },
  jack: {
    id: 'jack', name: 'Jack', age: 28, pronouns: ['he', 'him', 'his', 'himself'],
    tagline: 'It always worked out.',
    story: 'Jack climbed the beanstalk, robbed the giant and got away down the stalk with a goose and a harp, and learned from it that bravado and a quick tongue will get him out of anything. They always have. Nobody ever made the bill come due. At twenty-eight the exits are closing, and he has noticed, and would like to know what happens when they all close at once. He asked to come here, grinning, and then asked what the rules were.',
    base: { wil: 6, att: 3, res: 1, sat: 5, val: 4, com: 2 },
    grad: [['wil', '<=', 3]],
    pain: { tolerance: 0.7, resilience: 0.65 },
    traits: [{ stat: 'res', factor: 0, sources: ['overshoot1'], when: { val: ['>=', 4] } }],
    note: 'High Wilfulness, low Resentment: defiance is appetite, not grievance. Takes a firm hand well so long as he still feels valued.',
    bias: { petty: 1.3, boundary: 1.2 },
    lines: {
      open: ['"Go on then, {Title}. Bet I can take it without making a sound."', '"Sure. Why not. What\'s the worst that can happen? — no, don\'t answer that."'],
      arrive: '"Jack. Sometimes the Giant-Killer, but mostly just Jack. Have you got any beans? No? Pity."',
      leave: '"First time I\'ve ever climbed down on purpose, {Title}. Funny. The view\'s better."',
    },
  },
  hans: {
    id: 'hans', name: 'Hans', age: 27, pronouns: ['he', 'him', 'his', 'himself'],
    tagline: 'Never learned to shiver.',
    story: 'Hans went out into the world to learn what it was to shudder, and never did: not at the haunted castle, not at the gallows, not at anything. There was no moral at the end of it, only a boy who could not feel the thing that tells everyone else to stop. He has been told all his life that he is brave. He would like, very much, to be told when he has gone too far, and has come here to be shown where that is.',
    base: { wil: 2, att: 4, res: 1, sat: 4, val: 3, com: 1 },
    grad: [['com', '>=', 6]],
    pain: { tolerance: 0.97, resilience: 0.9 },
    traits: [{ stat: 'wil', factor: 0.5, sources: ['correction'] }],
    note: 'Severity barely registers. Escalating on him only repeats the mistake his story is made of; he moves on aftercare and attention.',
    bias: {},
    lines: {
      open: ['"Whatever you think is needed, {Title}. I don\'t suppose I\'ll feel much, but do go on."', '"I\'ll tell you honestly if it does anything. It usually doesn\'t."'],
      arrive: '"Hans. Nothing frightens me, and I\'m told that is the problem."',
      leave: '"I shivered last night, {Title}. Just once. It was wonderful."',
    },
  },
  snow: {
    id: 'snow', name: 'Snow White', age: 25, pronouns: ['she', 'her', 'her', 'herself'],
    tagline: 'Rescued, again and again.',
    story: 'Nobody ever poisoned the apple, and nobody ever lifted a curse: the huntsman let her go, the dwarfs took her in, a hundred kind people kept her safe, and she learned only that someone else always decides. She says yes to whoever is kindest and has never had to find out what she wants. Her life since has been easy to move in any direction. She chose this house herself, and wrote that down for you before she would say anything else.',
    base: { wil: 1, att: 5, res: 1, sat: 2, val: 4, com: 2 },
    grad: [['com', '>=', 5], ['sat', '>=', 4]],
    pain: { tolerance: 0.3, resilience: 0.4 },
    traits: [{ stat: 'val', factor: 2 }, { stat: 'sat', factor: 0.5 }],
    note: 'The mirror of Rapunzel: too easy to move, in any direction. Compliance is not security. Needs consistency of source, not just warmth.',
    bias: { dishonest: 1.4 },
    lines: {
      open: ['"Yes, {Title}. Whatever you think. I\'ll be good."', '"I don\'t mind. Really. I never mind."'],
      arrive: '"I\'m Snow White. I\'m — I\'d like to learn to want things. If that\'s all right."',
      leave: '"I said no to someone today, {Title}. I said it and nothing happened. I wanted you to know."',
    },
  },
};
const ORDER = ['red', 'goldilocks', 'rapunzel', 'jack', 'hans', 'snow'];

// ── Chores ──────────────────────────────────────────────────────
// diff 1–3. `phrase` slots into sentences. Paired chores take two residents.
const CHORES = [
  { id: 'washing', name: 'Washing', phrase: 'the washing', diff: 1 },
  { id: 'sweeping', name: 'Sweeping', phrase: 'the sweeping', diff: 1 },
  { id: 'water', name: 'Fetching Water', phrase: 'the water-fetching', diff: 1 },
  { id: 'hens', name: 'Feeding the Hens', phrase: 'the hens', diff: 1 },
  { id: 'mending', name: 'Mending', phrase: 'the mending', diff: 2 },
  { id: 'cooking', name: 'Cooking Supper', phrase: 'supper', diff: 2 },
  { id: 'floors', name: 'Scrubbing the Floors', phrase: 'the floors', diff: 2 },
  { id: 'garden', name: 'Tending the Garden', phrase: 'the garden', diff: 2 },
  { id: 'preserving', name: 'Preserving', phrase: 'the preserving', diff: 3 },
  { id: 'hearth', name: 'Hearth Care', phrase: 'the hearth', diff: 3 },
  { id: 'laundry', name: 'Laundry Line', phrase: 'the heavy linens', diff: 2, paired: true },
  { id: 'baking', name: 'Baking', phrase: 'the baking', diff: 2, paired: true },
  { id: 'furniture', name: 'Moving Furniture', phrase: 'the furniture', diff: 2, paired: true },
];

// What the Behaviour Card says about the day's chore, by outcome. {Name} {Subj} {Poss} {Chore} {Partner}
const CHORE_LINES = {
  well: [
    '{Name} did {Chore} so thoroughly it was a pleasure to look at. {Subj} even hummed through it.',
    '{Name} finished {Chore} early and then went looking for something else to put right.',
    '{Chore} was done beautifully today. {Name} wouldn\'t take the credit, but {Subj} stood a little straighter for it.',
  ],
  completed: [
    '{Name} did {Chore}, start to finish, without being asked twice.',
    '{Name} saw {Chore} through. Nothing remarkable, nothing wrong.',
    '{Chore} got done. {Name} went about it steadily and quietly.',
  ],
  partial: [
    '{Name} got most of {Chore} done and left the rest "for later", which is not a time.',
    '{Name} started {Chore} well and drifted. Half of it is finished and half of it is a good intention.',
    '{Chore} was done, after a fashion. There are corners {Name} is hoping nobody checks.',
  ],
  failed: [
    '{Name} made a real mess of {Chore}. It will have to be done again, by someone, and {Subj} knows it.',
    '{Chore} did not get done. {Name} has a very detailed explanation, and it has no end.',
    '{Name} abandoned {Chore} halfway and was found elsewhere, looking out of a window.',
  ],
};
const PAIR_LINES = {
  well: ['{Name} and {Partner} did {Chore} together as if they had done it all their lives.'],
  completed: ['{Name} and {Partner} saw {Chore} through between them, with only a little muttering.'],
  partial: ['{Name} and {Partner} got most of {Chore} done and each privately believes the other one left the rest.'],
  failed: ['{Name} and {Partner} made a tangle of {Chore} between them, and neither will say whose fault it was.'],
};

// ── Events ──────────────────────────────────────────────────────
// {Name} {Subj} {Poss} {Obj} {Refl} {Second} {Title}. Pronouns that start a sentence capitalise themselves.
// `trap`: the gentle answer is the right one; a correction counts as an overshoot, and a kind word pays extra.
const EVENTS = {
  petty: [
    '{Name} put a frog in someone\'s shoe. {Subj} isn\'t saying whose. {Subj} is very pleased about it.',
    '{Name} "lost" the mending needle rather than finish {Poss} sewing. It was in {Poss} pocket the whole time.',
    '{Name} ate the last of the honey cake that was meant to be shared, and left the crumbs as the only evidence.',
    '{Name} swapped the salt and the sugar in the kitchen jars, just to see what would happen at breakfast.',
    '{Name} was asked to fetch water twice. Both times {Subj} came back with a very good reason why {Subj} hadn\'t.',
    '{Name} hid under the stairs during chore assignment and let everyone assume {Subj} had already left for the well.',
    '{Name} drew a face on the fogged-up window and left it there for {Poss} own amusement.',
    '{Name} answered every single question at supper with a riddle instead of an answer, and thought it was very funny.',
    '{Name} "accidentally" let the cat into the pantry. There is now cat in the butter.',
    '{Name} rearranged everyone\'s boots by the door, left to right, just to watch the confusion.',
    { only: 'red', text: '{Name} went to fetch the water and came back an hour later with a basket of flowers and no water. {Subj} had only been looking.' },
    { only: 'goldilocks', text: '{Name} tried every chair in the parlour before sitting, found fault with all of them, and ended up on the stairs.' },
    { only: 'jack', text: '{Name} traded the good kettle to a pedlar for "a handful of very promising beans" and is certain it will come out well.' },
    { only: 'hans', text: '{Name} was told a ghost story at the fire and asked, politely, whether it was meant to be frightening.' },
  ],
  boundary: [
    '{Name} was told not to go past the garden wall. {Subj} went anyway, and came back with berries picked past it, sweetly, as if that settled it.',
    '{Name} was asked not to touch the good dress. {Subj} wore it anyway, for "just a minute", which became most of the afternoon.',
    '{Name} was told to be in before dusk. {Subj} came back well after dark, unbothered, whistling.',
    '{Name} was asked to knock before entering. {Subj} didn\'t. Twice.',
    '{Name} was told the top shelf was not to be climbed for. {Subj} climbed for it anyway and knocked half of it down.',
    '{Name} was asked to wait to be excused from the table. {Subj} got up halfway through and simply left.',
    '{Name} was told the second helping was for after chores were done. {Subj} took it first and did the chores after, if at all.',
    '{Name} was asked not to wander past the tree line alone. {Subj} did, and came back with leaves in {Poss} hair and no apology in mind.',
    { only: 'red', text: '{Name} was told to stay on the path to the well. {Subj} found four other paths and took the one with the most interesting noise at the end.' },
    { only: 'goldilocks', text: '{Name} slept in the guest room that was shut up for the season. "It was just right," {Subj} said, as though that settled it.' },
    { only: 'rapunzel', text: '{Name} said yes to a stranger at the gate who asked to be let in for the night, without asking anyone first.' },
    { only: 'jack', text: '{Name} climbed onto the roof to see what could be seen. {Subj} saw quite a lot, and has been telling it to anyone who\'ll listen.' },
    { only: 'hans', text: '{Name} slept in the cold cellar on purpose, to see whether it would make {Obj} shiver. It did not.' },
    { only: 'snow', text: '{Name} took an apple from a woman at the gate without asking where it came from, and has been in a very good mood about it since.' },
  ],
  friction: [
    '{Name} took {Second}\'s comb without asking, and broke it. {Subj} hasn\'t said anything about it.',
    '{Name} snapped at {Second} over nothing at supper. Later {Subj} wouldn\'t say why.',
    '{Name} and {Second} haven\'t spoken since yesterday. Neither will explain what happened.',
    '{Name} took the last of the warm water before {Second} could have a turn, and didn\'t seem to notice or care.',
    '{Name} said something sharp to {Second} in front of everyone. {Second} went quiet for the rest of the evening.',
    '{Name} blamed {Second} for a chore {Subj} hadn\'t finished {Refl}. {Second} didn\'t argue, but didn\'t forget it either.',
    '{Name} wouldn\'t sit near {Second} at supper, and moved {Poss} chair rather loudly to make the point.',
    '{Name} read something of {Second}\'s that wasn\'t meant to be read, and won\'t say what it was.',
  ],
  dishonest: [
    '{Name} told two different stories about where the missing coin went, and neither one quite matched.',
    { trap: true, text: '{Name} said {Subj} was fine. {Subj} was not fine: {Subj}\'d been crying in the stairwell for the better part of an hour.' },
    '{Name} claimed {Subj} hadn\'t heard the call for supper. {Subj} was standing close enough to have heard it twice.',
    { trap: true, text: '{Name} has been quietly slipping food into {Poss} pocket at meals, and won\'t say why, or where it\'s going.' },
    '{Name} said the broken jug wasn\'t {Poss} doing. The evidence rather strongly suggests otherwise.',
    { trap: true, text: '{Name} has been saying {Subj}\'s sleeping fine. {Subj} is not sleeping fine. The candle in {Poss} room burns very late.' },
    { only: 'jack', text: '{Name} told a tale at supper of how {Subj} talked {Poss} way out of a debt. Most of it was true. Not the part about the debt.' },
    { only: 'rapunzel', trap: true, text: '{Name} gave away {Poss} supper to a passing pedlar at the gate, and told everyone {Subj} had eaten it.' },
    { only: 'snow', text: '{Name} said yes to everything asked of {Obj} today, including two things that contradicted each other.' },
  ],
  neglect: [
    '{Name} hasn\'t touched {Poss} supper in two days. When asked, {Subj} just shrugged.',
    '{Name} has stopped singing at {Poss} chores. {Subj} used to sing at everything.',
    '{Name} keeps the door of {Poss} room shut, even in daylight.',
    '{Name} sat apart from everyone at breakfast again this morning, and left before anyone could ask why.',
    '{Name} hasn\'t laughed in several days, not even at things that would usually get one out of {Obj}.',
    '{Name} has been going to bed before the candles are even lit, and rising after everyone else has already started the day.',
    '{Name} flinched when {Subj} thought no one was looking, over something entirely ordinary.',
    '{Name} has stopped asking questions. {Subj} used to ask about everything.',
    { only: 'rapunzel', text: '{Name} has taken to sitting at the high window in the evenings, looking down the road, and won\'t say what {Subj} is watching for.' },
    { only: 'hans', text: '{Name} has stopped coming to the fire in the evenings. {Subj} says {Subj} doesn\'t mind the cold. That is rather the trouble.' },
    { only: 'snow', text: '{Name} ate whatever was put in front of {Obj} without looking at it, and thanked the person who put it there for the trouble.' },
  ],
  cruelty: [
    '{Name} told {Second} that nobody would miss {Obj} if {Subj} left. {Subj} said it to be cruel, and knew it.',
    '{Name} mocked {Second} for still being frightened of the dark. {Second} didn\'t answer, and went quiet for the rest of the evening.',
    '{Name} took something small of {Second}\'s and broke it in front of {Obj}, on purpose, to see {Poss} face fall.',
    '{Name} repeated something {Second} had told {Obj} in confidence, loudly, in front of the others.',
    '{Name} laughed when {Second} made a mistake at chores, and made sure {Second} knew {Subj}\'d seen it.',
  ],
};
// Base share, situational modifier on the correction, and the on-reveal stat effects (see rules.js).
const CATEGORIES = {
  petty:     { label: 'Mischief',            share: 30, mod: 0 },
  boundary:  { label: 'Boundary-testing',    share: 20, mod: 1 },
  friction:  { label: 'Friction',            share: 20, mod: 1, needsSecond: true },
  dishonest: { label: 'Concealment',         share: 15, mod: 1 },
  neglect:   { label: 'Withdrawal',          share: 10, mod: 0 },
  cruelty:   { label: 'A small cruelty',     share: 5,  mod: 2, needsSecond: true },
};

// ── Reprieves and aftercare ─────────────────────────────────────
// A reprieve replaces the correction for the evening; aftercare comes after one. `cost` is spent from the
// evening's candle (see rules.js EVENING_CANDLE). Effects are in rules.js.
const REPRIEVES = {
  stern:      { name: 'A Stern Word',       cost: 2, blurb: 'Say it plainly and send them off. Wilfulness down a little.' },
  kind:       { name: 'A Kind Word',        cost: 2, blurb: 'Sit with them and listen. Valued and Satisfaction up.' },
  reflection: { name: 'Written Reflection', cost: 2, blurb: 'Pen and paper; think it through. Composure up, Wilfulness down a little.' },
};
const AFTERCARE = {
  corner: { name: 'Corner Time', cost: 1, blurb: 'A few quiet minutes facing the wall. Composure up; if they feel unvalued it stings instead.' },
  lines:  { name: 'Lines',       cost: 1, blurb: 'Careful, attentive work. Composure and Attention up, no downside.' },
  held:   { name: 'Held After',  cost: 2, blurb: 'You stay with them until it eases. Valued up, Resentment down.' },
  warm:   { name: 'Warm Words',  cost: 1, blurb: 'Something kind, once it is over. Valued and Satisfaction up.' },
};

// ── Things people say. {Title} {Name} ───────────────────────────
const SAYINGS = {
  well:    ['"Yes, {Title}. I understand."', '"…Thank you, {Title}. I needed that."', '"That was fair. I know it was."'],
  under:   ['"Is that all, {Title}?"', '"Oh. Is that — are we done?"', '"I\'d braced for more, {Title}."'],
  over:    ['"That was… more than I needed, {Title}."', '"I\'d have listened with less, {Title}."', '"It\'s over. Please can it be over."'],
  harsh:   ['"Stop — please, {Title}. Please."'],
  word:    ['"{Title}. The word. I\'m using the word."'],
  nothing: ['"…Oh. All right, {Title}."'],
};

root.FairyShoeContent = { STATS, STAT_NAMES, STAT_HINTS, CHARACTERS, ORDER, CHORES, CHORE_LINES, PAIR_LINES, EVENTS, CATEGORIES, REPRIEVES, AFTERCARE, SAYINGS };
if (typeof module !== 'undefined' && module.exports) module.exports = root.FairyShoeContent;
})(typeof window !== 'undefined' ? window : globalThis);
