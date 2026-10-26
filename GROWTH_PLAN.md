# Growth plan: @21stcentury.sahil, from one format to four (Oct 2026)

The talking-head tool reels are working: visual, everyday-creative tools get comments and follows.
They stay at 1-2 a day. Around them we add three formats that need no recording from sahil:

| format | what it is | cadence (target) | status |
|---|---|---|---|
| **Tool reels** (existing) | his face, the script, motion graphics, hand-painted shots | 1-2 / day | live |
| **Faceless explainers** | "how it actually works" + "how AI actually works", 3D animated, narrated | 3 / week, then daily | first video built |
| **The Dispatch** (news carousels) | a news story as a swipeable printed-zine carousel | when a news card isn't recorded | design system + first carousel built |
| **Stories** | every post re-shared to the story automatically | every post | planned |

Research behind this: @speedy_devv (180K, "how does X really work under the hood", 17.5M views on
touchscreens, 10.4M on phone keyboards), @scroll.engineer (147K from 31 posts, 3D engineering
explainers), @adilet.fndr (42K in 35 days, Claude-made explainers with a comment-keyword funnel),
Meta's developer docs, and sahil's own Instagram insights (see DISCOVERY.md).

---

## 1. Faceless explainers

**Topics.** Two lanes, mixed: *how it actually works* (everyday or newsworthy tech: a fold screen,
noise cancelling, Face ID, EV-charging roads) and *how AI actually works* for non-developers (why
chatbots make things up, how an image model turns noise into a picture, what a GPU does, why data
centres need power plants). Picked at 3am from what's trending this week, scored on mainstream
curiosity × visual potential × evergreen, never a straight copy of a topic the big pages just did
unless we have a new angle (e.g. not "how the iPhone fold works" but "why it's already cracking").

**Script.** 60-85 s, ~180-230 words, one narrator. A hook with stakes in the first line, then an
*investigation* shape that holds people: "three suspects", "five layers", "four steps", with an
on-screen counter that fills as the video goes (adilet's trick, it gives viewers a reason to
stay). Every claim traces to a source, listed in the script file. The ending is share-bait, not a
CTA ("send this to the friend who pre-ordered"): sends are Instagram's strongest signal for
non-followers (Mosseri, Jan 2025).

**Look** (built: `studio/src/explainer/kit.tsx`). After speedy_devv: a dark charcoal studio,
semi-real 3D objects, the invisible physics drawn in warm gold, internals in an x-ray blue,
captions at the top 1-3 words at a time with the key word in a Figma-style selection box, thin
leader-line labels, honest notes ("Magnified illustration · not to scale", "Hinge after iFixit's
CT-scan rebuild"), cited sources at the end. Per video, Opus writes bespoke 3D scenes on top of
the kit (Remotion + react-three-fiber + drei, procedural geometry, CC0 models from Kenney /
Quaternius / Poly Haven when a real object is needed).

**Quality loop.** Exactly what made the first video work: render stills at every beat, look at
them, fix framing, labels, empty frames and collisions, look again. At 3am this runs as Opus with
vision over contact sheets, max 3 passes, before the full render.

**Voice.** ElevenLabs ("Brian", multilingual v2) with a hard monthly cap of 10,000 credits
(`bot/src/lib/elevenlabs.ts`: checks the account's real usage before every call, ledger
backup, cache so a re-render never pays twice). One explainer ≈ 1,100-1,300 credits, so ~7 a
month at full quality, ~14 on Flash v2.5. To go daily we need a free voice for the rest: the
gym-page agent is benchmarking free models (Kokoro, Chatterbox…) on the runner right now. If one
is close enough we use it as the default and keep ElevenLabs for the best topics.

**Render.** On the runner with ANGLE-on-llvmpipe (no GPU): estimated 1-3 s a frame, so 40-120 min
per video, inside the 3am-7am window, after the digest and never alongside a tool-reel render.

**Publishing.** Telegram preview with [Post] / [Redo] / [Edit] (same as tool reels) for the first
two weeks, then optionally auto-post. Trial reels (`trial_params`, graduation `SS_PERFORMANCE`:
Instagram shows it to non-followers first and promotes it to followers only if it does well) once
the account is eligible (reportedly ~200+ followers; the bot tries and falls back). `is_ai_generated`
set on every post with a synthetic voice (Meta requires it). Caption: a "comment HOW for the
sources" keyword so the DM funnel works here too.

## 2. The Dispatch: news carousels

**Design** (built: `studio/src/carousel/Dispatch.tsx`). Deliberately *not* the reels' look and not
any of the three obvious "AI news" looks (dark glass + neon, white Apple-minimal, terminal green).
A risograph-printed broadsheet: newsprint paper, exactly two spot inks per issue that overprint
where they cross (five real riso pairings, rotating), halftone-dot images, a hair of
misregistration, condensed headlines over a newspaper serif, a masthead with issue numbers. The
whole carousel is one wide image sliced into slides: the cover's "clipping" (a halftoned crop of
the real source, taped on at an angle) crosses into slide 2, and a "wire" runs along the bottom
of every slide, station to station, so each swipe visibly continues the last.

**Slides** (7-10, 1080×1350): cover (headline + deck + clipping) → what happened → how it works
(a diagram) → the number → what people are saying (a real, verified quote) → the catch → what it
means for you → follow @21stcentury.sahil + "comment NEWS → the full story in your DMs" + "or tap
the link in bio". Slide 2 is written as a second hook (carousels get re-served starting there).

**Flow.**
1. The morning digest gets buttons: **[1] [2] [3] [skip]** instead of "reply a number".
2. When he skips, or by evening if the day's news card wasn't recorded, the bot asks: "Post #3 as a
   carousel?" **[Yes] [No]**.
3. On yes: Opus writes the slide JSON from the card's sources (every quote checked against the
   source, like the Dessa sample), Playwright screenshots the source for the clipping, the strip
   renders and slices.
4. Telegram shows the slides as an album with [Post] / [Redo] / [Edit].
5. [Post] publishes a CAROUSEL via the API, adds the site row and article, posts a story, and the
   DM autoresponder answers NEWS with the article link.

## 3. Stories

Every post goes to the story automatically: the reel itself (if ≤60 s) or a 15-30 s teaser cut of
a longer explainer, and the cover of a carousel. The API can't add stickers, polls, links or
music, so twice a week the bot nudges sahil to do one by hand (a poll on the day's topic). No
story for trial reels (it would show the trial to followers).

## 4. Growth levers we're pulling

- **Hook & skip rate.** The first 1.5 s carries the stakes (picture + words). Target skip rate
  under 40% (his under-45% reels got ~4× the views).
- **Open loops.** Counters ("SUSPECTS 1/3"), numbered structures, payoff at the end. Loopable
  endings where the last frame matches the first.
- **Sends.** Share-bait endings on explainers, "send this to…" moments, practical takeaways on
  carousels.
- **Volume and consistency.** ~2 posts a day across formats; the Oct 7-9 streak (5 reels, ~2,300
  views each) is the proof.
- **Comment funnel.** TOOL / NEWS / HOW keywords → DM with the link. Switch the follow gate from
  `strict` to `soft` (see risks).
- **Profile conversion.** Pin the three best posts, a bio that names the three series, highlight
  covers per series. A profile visitor should see in one glance what they'd get by following.
- **Measure.** The 3am analyst compares formats week over week (views, skip rate, sends, follows
  per post) and proposes changes through the existing Approve/Deny flow.

## 5. Risks and rules

- **The DM follow gate breaks Meta's spam policy.** "Requiring users to engage (…follows…) to gain
  access to content" is on the not-allowed list, and `DM_FOLLOW_GATE=strict` does exactly that.
  Recommendation: `soft` (ask once, send either way). Needs sahil's OK.
- **AI disclosure.** Synthetic voice → `is_ai_generated=true`. Faceless doesn't mean pretending
  to be human.
- **Facts.** Every number and quote sourced and checked; honest "illustration" notes on
  recreations; sources on screen.
- **Limits.** ≤100 API posts per 24 h (read `content_publishing_limit`), ≤5 hashtags, no duplicate
  posts on publish retries.
- **Budget.** The ElevenLabs cap is enforced in code; renders never overlap.

## 6. Build order

| phase | what | when |
|---|---|---|
| A | explainer kit + first explainer; carousel design system + first carousel; ElevenLabs guard | done (Oct 25) |
| B | carousel pipeline (copy → render → slice → Telegram album → publish), digest buttons + skip→carousel flow, stories on every post, follow gate → soft | next, ~1-2 days |
| C | explainer automation at 3am (topic → sourced script → voice → bespoke scenes → vision review → render → Telegram), free-voice fallback | ~2-4 days, first runs reviewed by sahil |
| D | trial reels, format analytics, profile refresh (pins, bio, highlights) | after C |
