# The Fairy Shoe

A halfway house for fairytale characters whose stories ended without a moral, or who never lived the one we know them
for, and who find themselves, at eighteen or past it, unable to fit the strict adult world. You run the house. They
call you whatever you tell them to; you are never named, only "you".

It is built on the Starlight engine (`starlight-engine.js`, three.js r128 in `vendor/`) and takes its structure from
the Birchwood House spec, with one big change: **there are no cards**. Each evening's correction is live, and its
beginning, end and content are entirely the player's.

**Everyone in the house is an adult (18+) who came in of their own accord, knowing what the house is for.** The
runaway rule of the spec is the *word*: a safe word that can be used at any moment. When it is used the scene stops,
the resident leaves the house, their stats reset to their starting spread and they go back in the pool of people who
might arrive again. Nothing in the game overrides it.

## Run it

```
npm run serve        # then open http://localhost:8765/
npm test             # rules unit tests (Node, no dependencies)
npm run e2e          # browser smoke test, needs Playwright (see the header of tests/e2e-smoke.js)
```

Any static server works; there is no build step. Progress autosaves in `localStorage` at the start of each morning.

## The day

1. **Morning.** A fresh chore list is generated: one place per resident, some chores paired (two residents, resolved
   on the lower effective Attention and how well they get on). Tap a resident then a chore, or drag. The day starts
   when everyone is placed.
2. **Resolution** (no screen of its own): chores resolve against *effective* Attention (all six stats bear on it) →
   moving on is checked → events roll (at most two, on two different people) → moving on is checked → Behaviour Cards.
3. **Evening.** Each resident, in turn, shows their Behaviour Card (the day's chore, and any event). You choose:
   - **Sit them down**: a live correction, or
   - **Offer a word**: a reprieve (stern, kind, written reflection) that replaces the correction.
4. **The night.** Anyone at Resentment 7 with Valued ≤ 2 uses the word. The house is refilled to three (unseen
   characters first; once everyone has been through, those who moved on come back as fresh arrivals), and it's morning.

## The live correction

You choose position, implement and what they wear, then everything is live:

- **Smack** once, or **Run** a number and **Stop** whenever you like (Space also smacks), then **End the correction** when you decide it is done.
- **Pace** and **Strength** are multipliers with − / + buttons (how fast you swing and how soon the next comes; how hard each lands). **Run** sets how many smacks a run gives.
- **Change position…** opens a list; a short passage of narration plays while the room is set again. The pain, the marks and the clock carry over. (Over the table, across the lap, hands on head, hands on the chair, bent over with feet apart. The last needs the switch or paddle.)
- **Change implement…** opens a list. The hand is simply put down; anything else has to be fetched, which is a short exchange: the options on offer, and how the resident answers, depend on their stats and how far along they are (ask politely, tell them, explain what it is for, say nothing and fetch it yourself, or check they are all right to go on). The first exchange of a correction can nudge a stat; the resident then comes back, returns to position, and the new implement is in hand.
- **Layers** (skirt, bottoms, briefs) are toggled live; the skirt cycles *down* (it drapes as cloth and the palm lands on it), *hitched up* at the back, or *off*. Clothing over the struck area cushions the sting, as in the engine's pain model.
- **Cameras**: Overview (a three-quarter view from behind, on the side away from the player, free to orbit from there), Behind (square behind the subject, on the contact sites), Over your shoulder (the player's right shoulder, the striking arm's), Face (on the resident's face, from in front, at a height that suits the pose and far enough back to keep their movement in frame).

The engine's pain model (tolerance, resilience, implement, speed, dread, dwell, clothing, tender skin) turns what you
do into a **distress** reading for that resident. The *highest* distress you bring them to is scored against the band
they needed that evening:

| Band | Peak distress | Needed by |
|---|---|---|
| Minimal | < 0.2 | Wilfulness 1 |
| Light | 0.2 – 0.55 | Wilfulness 2–3 |
| Moderate | 0.55 – 0.9 | Wilfulness 4–5 |
| Firm | 0.9 – 1.2 (the edge of resistance is 1.0) | Wilfulness 6–7 |
| Severe | 1.2 – 1.5 | only with a situational modifier on top |
| Too harsh | ≥ 1.5 | never; nothing more is struck |

Trouble shifts the band up (a half-done or failed chore +1; an event +0 to +2; both stack, capped at +2). The "trap"
events (someone hiding that they are not fine) need a gentle answer, not a hand. Match quality drives the stats exactly
as in the spec (well-matched / undershoot / overshoot). Too harsh counts as a far overshoot, and if the resident's trust
is already thin (Valued ≤ 3 or Resentment ≥ 5) they use the word on the spot.

**Guidance** (on by default, toggle in the header) shades the band the resident needs on the meter.

### The room

A bare room in a medieval cottage: boarded floor, lime-washed stone walls, beamed ceiling, a window that lights the scene, a hearth, a door, a broom and a bucket. The furniture is plain joinery built to the engine's dimensions in `js/room.js`: the plank-seated chair the player sits in (which a resident can also bend over, hands on the seat) and a table with a thick plank top (which they bend over at full height).

### Skirts

A skirt is simulated cloth (`SKIRT` and `skirtStep` in `starlight-engine.js`), and in the discipline scene it is back on by default.

- **Weight.** It is stepped at a fixed 120 steps a second whatever the frame rate, under real gravity with very little air drag, with mass that grows toward the hem (a sewn hem), so it falls, swings and settles instead of floating. Dropped 10 cm it falls 4.8 cm in the first 0.1 s (free fall is 4.9) and is at rest within a second, the same at 20, 60 and 120 frames a second.
- **Folds, not a lampshade.** Stretch is resisted hard and capped at 5%; squashing is resisted much less, so the cloth buckles into folds instead of holding a bell shape; bending is weak; neighbours damp each other so it doesn't ring.
- **Putting it on.** `settleSkirt` walks the body from standing into the pose with the cloth falling and draping, then restores the pose exactly, so a bent-over subject's skirt hangs and rides the way it would have if she had bent over in it (a short skirt rides up over the back, a longer one falls around the hips) rather than lying on her back.
- **No clipping.** Collisions are resolved so that bodies and furniture come first, then other people's hands, and the cloth's own body last, with the floor having the last word, so wherever cloth is squeezed (a palm pressing it onto skin) it ends on the skin and never inside it. Particles can't move further than 16 mm in a step, so they can't tunnel through the skin test; the cloth's layers push each other apart; the palm is held a cloth's thickness further out so it lands on the cloth.
- **Tests.** `tests/skirt-physics.js` checks the fall and its frame-rate independence, and that nothing ends up inside the body, speeds stay sane and the mesh stays finite in every position and with several implements.

### Goodbyes

Moving on and using the word are scenes, not cards: the resident stands in the cottage room, a few beats of narration and talk play over it, and you get one choice that colours the parting. They play wherever it happens (after a result card, during the day, or overnight), before anyone new is introduced.

- **Moving on**: each resident has their own opening, three answers to what you say (proud of them / what will they do first / just open the door), and a last image. Their closing line is the one from the Collection.
- **The word**: the narration differs for a resident brought too far and one who has quietly reached the end of their patience. The options (thank them, ask if they need anything, step back and open the door) never try to talk anyone out of it, and the resident's replies follow how they were feeling (willing, sullen, cheeky, flustered, plain). It always ends with nothing held against them.

All of it is data in `js/content.js` (`SCENES`), assembled by `farewellScene` in `js/rules.js`.

### Candle (replaces the card hand)

Corrections are free; reprieves and aftercare are paid from five marks of candle per evening: reprieves cost 2,
Corner Time / Lines / Warm Words 1, Held After 2. That is what keeps "always offer a kind word" from being a solved game.

## The cast

Red (never met the wolf), Goldilocks (nobody ever came home), Rapunzel (the prince never came), Jack (it always
worked out), Hans (never learned to shiver; the spec's "Corren"), Snow White (rescued, again and again). Starting
spreads and moving-on thresholds are the spec's; their quirks (Hans's halved Wilfulness movement and near-immunity to
severity, Snow White's doubled Valued and sluggish Satisfaction, Jack shrugging off a small overshoot while valued, Red
reading over-correction as abandonment, Goldilocks reading a reprieve as no consequence) live in `js/content.js` and
`changeStat` in `js/rules.js`.

## Character editor

`editor.html` (linked from the title screen) is the Starlight character viewer, with the Fairy Shoe's cast in place of the stock bodies and no environment: just the figures on a plain floor. It has everything the viewer has:

- **Characters**: the six residents and the four looks the player can have, one at a time or in a line-up.
- **Clothing**: looks, per-layer ticks and colours, skin tone. **Pose**: the pose library, hands on head, spread.
- **View**: skeleton, weights, wireframe, turntable, head camera.
- **Discipline scene**: show it, loop the swing, smack, clear marks, sound; implements, disciplinarian, subject, position (lap, over the table, hands on head, hands on the chair, bent over with feet apart), beat, swing speed and holds, palm angle. The furniture is the game's cottage chair and table.
- **Pose editor**: freeze the scene at a beat, drag joints or the implement, pin hands, and print a **Report**.
- **Measurements, face and expression sliders**, voxel size, and the design's JSON.

(The dance library is not part of this game, so that section is gone.)

What it adds is **Save to the game**. Everything above is a preview until saved; saved changes are kept in the browser (`localStorage`) and used whenever the game next builds a scene.

- **Save this look** stores what you changed about the selected character (as a patch over the built-in design: if you only moved the height, only the height is saved). *Remove its saved changes* and *Reset everything* go back to the built-in designs.
- **Paste a design**: a few fields as JSON (`{"height":172,"outfit":{"hair":"#5a1e12"}}`), or a whole preset as *Show JSON* prints it. Objects merge, arrays replace, `null` removes a field, colours can be numbers, `0xrrggbb` or `"#rrggbb"`.
- **Paste poses**: the pose editor's report as it is (it names its position, e.g. `Position: chair.`; older reports saying `Over the case.` mean the table), or JSON (`{"position":"case","who":"subject","beat":"base","bones":{"neck":[-40,0,0]}}`, a list, or `{position, giver:{…}, subject:{…}, beat}`). Angles are the engine's pose-table Euler degrees; where the scene itself drives a bone (the swinging arm's IK) the report's table value is used. **Save pose-editor edits** parses the Report you have just made without a paste. The subject's *base* and *contact* poses and the player's relaxed / raised / contact beats can be edited, per position.
- *Export all*, *Import* and *Undo* move and step through the saved changes.

## Layout

```
index.html            page shell
css/style.css
js/content.js         the cast, chores, event templates, lines (pure data)
js/rules.js           the rules (pure functions over JSON state; runs in Node)
js/overrides.js       design and pose edits from the editor (storage, parsing, merging)
js/room.js            the cottage room, the chair and the table
js/bodies.js          the residents' (and the player's) bodies, as Starlight presets
js/scene.js           the live-correction wrapper: cameras, rebuild-in-place, layers, pace and strength
editor.html           the character editor: the Starlight viewer plus Save to the game (js/editor-setup.js gives it the cast)
js/ui.js              interface and game flow
tests/rules.test.js   unit tests for the rules, including a long simulated run
tests/overrides.test.js  pose-report / design parsing, merging, and the implement exchange
tests/e2e-smoke.js    two days in headless Chromium, including every live control
tests/skirt-physics.js + skirt.html  the cloth: weight, frame-rate independence, no clipping
```
