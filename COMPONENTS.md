# COMPONENTS — the scene catalog (brand v2)

Every scene the director can emit. All sit on the dark base with ONE bright accent per video
(picked at render time — components read it from context, never hardcode colors). Source:
`studio/src/auto/` — theme.ts (tokens) · fx.tsx (bg/effects/captions) · v2-text / v2-data /
v2-ui / v2-media (the scenes). Catalog stills: `studio/catalog/<kind>.png`.

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
| stat | value, label?, kicker? | one number that carries the beat (counts up, glows) |
| statrow | items[{value,label}], kicker? | 2–3 metrics side by side |
| linechart | title?, values[], caption? | a trend ("straight up") |
| barchart | title?, unit?, rows[{label,value,hero?}] | head-to-head quantities; hero bar = accent |
| donut | percent, label?, kicker? | one percentage |
| table | title?, columns?, rows[{label,values[],hero?}] | leaderboard / lineup comparison |

## ui (product-grade cards)
| kind | props | use when |
|---|---|---|
| bento | title?, cells[{title,sub?,brand?}] | feature overview; first cell renders biggest |
| calendar | month?, highlights[], label? | frequency/date beats ("shipped every week") |
| timeline | title?, steps[{title,sub?}] | before/after, eras, how-it-went |
| chat | app?, messages[{role,text}] | an AI conversation; assistant reply types itself |
| notifications | items[{app,title,body?,brand?}] | news-drop moments; iOS stack falls in |
| checklist | title?, items[] | the gist in 3–5 ticks |
| kbd | keys[], label? | "it's one shortcut" moments |

## media (real assets)
| kind | props | use when |
|---|---|---|
| logo | name, tagline?, src? | company drop; model names go in tagline (Claude + "Sonnet 5") |
| logowall | title?, brands[] | "everyone's using it" |
| versus | a, b, aNote?, bNote? | head-to-head; `a` = the winner (gets the glow) |
| browser | url→src, label? | REAL site screenshot in dark browser chrome (marketing/docs/github URLs only) |
| phone | url→src?, label? | site/app in a phone frame |
| ascii | src? or brand?, label? | image/logo dissolves into glowing ASCII — hero moment, max 1/video |
| terminal | title?, lines[] | commands; types itself, accent prompt |
| code | title?, lines[], highlight?[] | code beats; accent-highlighted lines |
| tweet | name, handle, text, brand? | a take as a dark X card |

## bespoke
| kind | props | use when |
|---|---|---|
| custom | name (PascalCase), spec (what to build/animate), props{} | nothing above fits the beat — the component is CODE-GENERATED at render time (Opus writes it into generated/, typecheck-gated, auto-dropped on failure). Max 1/video. |

The director also CHOOSES the video's accent (blue/cyan/green/orange/red/pink/violet) to fit
the topic's vibe — returned as `accent` alongside `scenes`.

## rules of taste
- ≥ half the scenes visual (data/ui/media); text-only kinds ≤ ~40%.
- Named product ⇒ show its logo/site, don't just write it.
- One `ascii` max; `notifications`/`chat` are the strongest news-and-demo beats.
- Numbers on screen must be true. No real number → use a text kind instead.
- Backgrounds/motion/tokens are handled by the components — the director only picks kinds + content.
