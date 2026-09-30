# COMPONENTS — the scene catalog (brand v2)

Every scene the director can emit. All sit on the dark base with ONE bright accent per video
(picked at render time — components read it from context, never hardcode colors). Source:
`studio/src/auto/` — theme.ts (tokens) · fx.tsx (bg/effects/captions) · **kit.tsx (the building
blocks — see "kit" at the bottom)** · v2-text / v2-data / v2-ui / v2-media / v2-apps / v2-tools
(the scenes) · v3-flow / v3-ui / v3-media / v3-data / v3-text (the v3 vocabulary).
Catalog stills: `studio/catalog/<kind>.png`.

**Motion v3 (2026-09):** in the world renderer a scene HOLDS 4–8s while he talks about it, so every
component (1) paces its choreography to the beat — `useBeat()` is the scene's planned length, steps /
rows / clicks spread across roughly the first half of it; (2) stays ALIVE for the rest of the hold —
float + tilt, a beam travelling the hero card's border, sheens, flowing packets, pulsing live dots,
a blinking caret. Nothing is frozen after the entrance. Over his face (object mode) panels are dark
frosted glass and open layouts (charts, big numbers, lists) sit on a glass card.

Modifying and extending is ENCOURAGED: tweak props freely per video; new one-off components
belong in `studio/src/auto/generated/<videoId>/` and must (1) drive all motion from
`useCurrentFrame` (never wall-clock/Math.random — use remotion's `random(seed)`),
(2) read colors from `useAccent()` + `T` tokens, (3) wrap content in `<Scene>` from fx.tsx
(keeps it clear of the caption pill), (4) pass a still-render check before use.

Dont keep 2 pure text components back to back - the second one can be just my face's video with captions.

## text
| kind | props | use when |
|---|---|---|
| headline | text, emphasis?, kicker? | the hook / a big claim; one word glows accent |
| decrypt | text, sub?, kicker? | scramble→reveal; great cold-open or reveal beat |
| callout | text, emphasis? | short punchline between beats |
| quote | pre, boxed, post? | dry aside; key phrase in an accent chip |

## data (REAL numbers only)
| kind | props | use when |
|---|---|---|
| stat | value, label?, kicker?, prev? | one number that carries the beat — digits ROLL in like an odometer, accent bar with a travelling light; prev = REAL old value ("was 280") |
| statrow | items[{value,label}], kicker? | 2–3 metrics side by side |
| linechart | title?, values[], caption? | a trend ("straight up") |
| barchart | title?, unit?, rows[{label,value,hero?,brand?,note?}] | head-to-head quantities; bars spring up with counting values, hero bar = accent with a light climbing it; brand = logo under the bar, note = chip on the hero ("10x", only if true) |
| donut | percent, label?, kicker? | one percentage |
| table | title?, columns?, rows[{label,values[],hero?}] | leaderboard / lineup comparison |

## ui (product-grade cards)
| kind | props | use when |
|---|---|---|
| bento | title?, cells[{title,sub?,brand?}] | feature overview; first cell renders biggest |
| calendar | month?, highlights[], label? | frequency/date beats ("shipped every week") |
| timeline | title?, steps[{title,sub?}] | before/after, eras, how-it-went |
| chat | app?, messages[{role,text}] | an AI conversation; the assistant "thinks" (3 dots) then STREAMS its reply word by word; input bar with a caret holds |
| notifications | items[{app,title,body?,brand?}] | news-drop moments; iOS banners drop in paced over the beat with a haptic wiggle, newest glows |
| checklist | title?, items[] | the gist in 3–5 ticks — ticks DRAW themselves one by one, a light sweeps the list after |
| kbd | keys[], label? | "it's one shortcut" moments |

## media (real assets)
| kind | props | use when |
|---|---|---|
| logo | name, tagline?, src? | company drop; the real mark DRAWS itself in a glowing tile, orbit rings turn, tagline types (model names go in tagline: Claude + "Sonnet 5") |
| logowall | title?, brands[] | "everyone's using it" |
| versus | a, b, aNote?, bNote? | head-to-head; cards swing in, VS slams, `a` = the winner (lifts, beam, check); numeric notes count up |
| browser | url→src, label? | REAL site screenshot in dark browser chrome; page "loads" then slowly scrolls + pushes in during the hold (marketing/docs/github URLs only) |
| phone | url→src?, label? | site/app in a phone frame |
| ascii | src? or brand?, label? | image/logo dissolves into glowing ASCII — hero moment, max 1/video |
| terminal | title?, lines[] | commands TYPE (first line, or lines starting "$ "), output STREAMS in with JSON-ish colour, spinner between, fresh prompt blinks |
| code | title?, lines[], highlight?[] | an editor: syntax colour, each line writes itself, highlight lines (1-based) get a breathing accent band |
| tweet | name, handle, text, brand? | a take as a dark X card |

## app ui (shadcn-grade product surfaces — v2-apps.tsx)
| kind | props | use when |
|---|---|---|
| command | query, results[{title,sub?,brand?}], pick?, hint? | ⌘K palette; query types, the selection walks to results[pick], ↵ confirms — "using the tool" beats |
| prompt | text, app?, sub? | "the prompt that did this" — a Claude-style composer: prompt types, send PRESSES, "<app> is working…" shimmers through the hold |
| search | query, suggestions?[], label? | search-bar beat; query types, suggestions drop in |
| diff | title?, lines[{text,type:add\|del\|ctx}] | code before/after; adds green, removes struck red |
| pricing | title?, tiers[{name,price,per?,features?[],hero?}] | cost/paywall beats; hero tier glows + "popular" chip (REAL prices) |
| leaderboard | title?, rows[{label,value,brand?,hero?}] | rankings/benchmarks; rows land bottom-rank-first, values count, bars scale to value, hero row glows with a beam (REAL numbers) |
| progress | label, percent, sub? | one big animated bar + counting % ("training run 87%") |
| toggles | title?, items[{label,on?}] | settings panel where a CURSOR clicks each switch on (ripple), "live" appears — feature-flag/launch beats |
| dashboard | title?, cards[{label,value,delta?,spark?[]}] | 2–4 KPI cards with sparklines; deltas green/red (REAL numbers) |
| receipt | title?, items[{label,value}], total{label?,value} | deadpan itemized bill; total slams in accent (API-cost humor) |
| inbox | items[{from,subject,preview?,time?,unread?,brand?}] | email-drop beats; unread dot glows |
| poll | question?, options[{label,percent,hero?}] | community-verdict beats; bars fill, winner glows |
| ticker | title?, rows[{symbol,label?,value,delta?}] | market/price-move beats; rows flash green/red |
| kanban | title?, columns[{title,cards[]}] | agents-doing-work; last card of last column lands late with the glow |
| waveform | label?, sub? | voice/audio-AI beats; accent bars breathe |
| rating | name, rating, count?, brand?, tagline? | app-store verdict card; stars fill one by one |

## tool review (the arc of a TOOL video — v2-tools.tsx)
what it is → how you get it → watching it actually work → what it replaces / the catch → where to find it
| kind | props | use when |
|---|---|---|
| toolcard | name, tagline?, brand?, by?, chips?[], badge?, specs?[{label,value}] | "what it is" — spec sheet at a glance: the mark draws itself, name rises, meta chips (first = accent), beam round the card. badge = "new"/"v2"; specs = ≤4 REAL spec rows for a model release. Facts only |
| install | title?, steps[{title,cmd?,sub?}] | "how you get it" — stepper paced over the beat: ring spins, command types, ↵ flashes, ring ticks, rail fills to the next step (≤4 steps, REAL commands) |
| runlog | title?, steps[{text,detail?}], result?{text,sub?} | "watching it work" — a todo list the agent works through: queued → shimmering active → ticked, progress line fills, status pill running→done, result slams in accent (details = real facts) |
| beforeafter | title?, beforeLabel?, afterLabel?, rows[{before,after}] | "what it replaces" — the old way is listed, then struck row by row as the new way pops in on the accent (≤4 rows, real numbers only) |
| catch | kicker?, items[{text,sub?}], verdict? | "the catch" — a live hazard stripe, caveats thud in, the verdict STAMPS; stays on the accent (a caveat, not an error) |
| getit | url, name?, brand?, badges?[], price?, note? | "where to find it" — closing card: URL types into an address bar, ↵, a beam lights the bar, real distribution marks (GitHub / npm / Homebrew / PyPI / App Store / Chrome Web Store), price chip if real, note under a live dot |

## v3 — the automation-creator vocabulary (v3-*.tsx)
Each one carries a long hold on its own. Natural heights are for the world layout table.
| kind | props | use when | ~height | screenshot? |
|---|---|---|---|---|
| flow | title?, nodes[{label,brand?,sub?}], edges?[[i,j]] | THE workflow graph (n8n/Make): nodes pop on a dotted canvas, edges draw, the workflow RUNS (packet per edge, nodes light up + check), then data keeps flowing. 2–7 nodes; edges default to a chain, branch with index pairs; logo-less nodes get a glyph from their words (schedule, webhook, email, if/filter, code, http, db, doc, chat) | 430 (chain) – 650 (branch / 5+ nodes, snakes onto 2 rows) | no |
| cursor | app?, title?, items[{label,sub?,brand?}], clicks?[i], action?, done?, result? | someone USING the product: a pointer glides in, clicks each target's button (press + ripple), it flips to `done`, a result toast lands | 560 (3 rows) – 800 (5) | no |
| highlight | url→src, label?, box?{x,y,w,h}, note?, style?("box"\|"underline") | zoom into a REAL page: loads, camera zooms to `box` (0–1 fractions of the 1280×1600 shot), highlighter draws, the rest dims, note chip pops | 930 | **yes** |
| json | title?, method?, status?, data, highlight?[keys] | an API response: in-flight spinner, status pill, pretty JSON streams in with syntax colour, highlighted keys get a breathing band (≤15 lines) | 620 (12 lines) – 790 | no |
| stack | title?, items[{label,brand?,note?}], into{label,brand?,sub?,note?} | "5 tools → 1": the grid of tools flies into the centre, the replacement slams in with a ripple + beam, old logos line up struck under it | 660 | no |
| kinetic | text, emphasis?, kicker? | kinetic typography: the line lands word by word with his voice, emphasis word(s) accent + drawn underline, words bob in the hold. Text kind — never back to back with another | 320–420 | no |
| split | title?, left{title,brand?,items[]}, right{…}, winner?("left"\|"right") | two-column compare: lines land alternately, winner side ticks + glow + beam, loser crosses + dims (≤4 lines a side) | 400–470 | no |
| logoorbit | center, brands[], label? | a hub and what it connects to (MCP / integrations): center mark draws, satellites pop onto a turning ring, packets pulse out along spokes (4–8 brands) | 860 | no |
| repo | repo "owner/name", description?, stars, forks?, language?, topics?[], today?, spark?[] | a GitHub repo blowing up: Star gets clicked, the REAL star count rolls up (odometer), trending chip, star-history sparkline with a pulsing tip | 510 – 740 (with spark) | no |

## bespoke
| kind | props | use when |
|---|---|---|
| custom | name (PascalCase), spec (what to build/animate), props{} | nothing above fits the beat — the component is CODE-GENERATED at render time (Opus writes it into generated/, typecheck-gated, still-rendered + visually verified, auto-dropped on failure). Up to 3/video, only when a beat genuinely needs it — a ceiling, not a quota. |

The director also CHOOSES the video's accent (blue/cyan/green/orange/red/pink/violet) to fit
the topic's vibe — returned as `accent` alongside `scenes`.

## rules of taste
- ≥ half the scenes visual (data/ui/media); text-only kinds ≤ ~40%.
- Named product ⇒ show its logo/site, don't just write it.
- One `ascii` max; `notifications`/`chat` are the strongest news-and-demo beats.
- Numbers on screen must be true. No real number → use a text kind instead.
- Backgrounds/motion/tokens are handled by the components — the director only picks kinds + content.
- In the world renderer, give the v3 kinds room: flow / cursor / repo / json read best held 5–8s.

## kit (for custom components)
`studio/src/auto/kit.tsx` — the building blocks every scene above is made of. Code-generated
`custom` components should start here instead of re-inventing panels and springs. Import from
`"../kit"` inside `generated/`. Everything is frame-deterministic; colours come from `useAccent()` + `T`.

**Timing**
- `const { f, fps, beat, sp } = useT()` — frame, fps, the scene's hold length in frames, and
  `sp(delay, "soft"|"snappy"|"bouncy"|"slow")` → a 0..1 spring starting at `delay`.
- `schedule(n, beat, { start, fill, min, max })` → n start frames spread over `fill` of the beat
  (step clamped to [min,max]) — pace lists/clicks/steps to how long he talks.
- `ramp(f, a, b, from?, to?, ease?)` eased clamped interpolate · `clamp01` · `wave(f, period)` · `breathe(f, period)`.

**Motion styles** (spread into `style`): `rise(p)` · `pop(p)` · `slide(p, dx)` · `focusIn(p)` (blur → sharp).
```tsx
const e = sp(4);
<div style={{ ...rise(e, 30) }}>…</div>
```
**Hold-life**: `<Float amp tilt seed>` hover + hair of 3D tilt · `<PushIn amount>` slow Ken-Burns ·
`<Beam/>` light travelling a card border · `<Sheen/>` periodic light sweep · `<LiveDot/>` pulsing dot.

**Surfaces**: `<Surface glow beam sheen tone="glass"|"solid" hot>` the glass card (dark frosted over his
face) · `<ObjectCard>` glass card only in world mode (for open layouts) · `<Window title right>` app/terminal
chrome · `<Chip hero>` · `<Label accent>` · `<Kicker text>` (legible over video).
```tsx
<Surface glow beam style={{ padding: 40 }}>
  <Kicker text="the result" />
  <TypeText text="deployed to prod" start={10} cps={30} />
</Surface>
```
**Text & numbers**: `typed(text, f, start, cps, fps)` → {shown, done, doneAt} · `<TypeText text start cps caret>` ·
`<Caret block solid>` · `<Counter value="3,000" start dur>` counts up a props string · `<Roll value="12,480">`
odometer digits · `<RevealText text emphasis>` words rise out of masks · `parseNum` / `countTo`.
Numbers must come from props — never invent one.

**Graph**: `bezier(p0, p1, "h"|"v")` / `cubic(p0, c0, c1, p1)` → `{ d, at(t) }` ·
`<Edge from to start dur hot pulseAt flowFrom packets via>` inside an `<svg>` — draws itself, fires a
run-packet, then keeps data flowing.
```tsx
<svg width={900} height={300}>
  <Edge from={{ x: 120, y: 150 }} to={{ x: 780, y: 150 }} start={10} pulseAt={30} flowFrom={50} />
</svg>
```
**Pointer**: `<Cursor keys={[{ x, y, at, hold?, click? }]} />` (parent `position:relative`) glides with an arc,
presses + ripples on `click` keys · `cursorAt(keys, f)` · `<Ripple x y at>`.
```tsx
<div style={{ position: "relative" }}>
  …UI…
  <Cursor keys={[{ x: 700, y: 500, at: 10 }, { x: 420, y: 180, at: 40, hold: 8, click: true }]} />
</div>
```
**Emphasis**: `<HighlightBox x y w h start label>` draws a box round a region · `<Marker>` highlighter
behind inline text · `<Underline start width>` accent bar that grows.

**Brand**: `<LogoTile brand size glow>` real logo in a glass tile (initial if no mark) · `<LogoChip brand label>` ·
`<LogoDraw brand size start>` the mark's outline draws then fills.

**Lists & marks**: `<TickList items starts>` boxes + drawn ticks · `<Check progress>` · `<Spinner>`.
