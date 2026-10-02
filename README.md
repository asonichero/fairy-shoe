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

You choose position, clothing and starting implement, then everything is live: **raise** the arm and hold it (dread
builds), **strike** when you choose, **smack** once, **run** a number of smacks and **stop** whenever you like, change
the implement, how hard, the swing speed, the hold before and after contact, and **end it** when you decide it is done.
Position and clothing are fixed once you begin.

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

## Layout

```
index.html            page shell
css/style.css
js/content.js         the cast, chores, event templates, lines (pure data)
js/rules.js           the rules (pure functions over JSON state; runs in Node)
js/bodies.js          the residents' (and the player's) bodies, as Starlight presets
js/scene.js           the live-correction wrapper around the engine's discipline scene
js/ui.js              interface and game flow
tests/rules.test.js   unit tests for the rules, including a long simulated run
tests/e2e-smoke.js    two days in headless Chromium
```
