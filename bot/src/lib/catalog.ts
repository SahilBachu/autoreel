// The SCENE CATALOG the director chooses from — one entry per scene kind the studio can
// render (studio/src/auto/scenes.tsx is the other half of this contract, COMPONENTS.md the
// human docs). Lives in its own file so the component library can grow without touching the
// director's rules in scenePlan.ts.
//
// Each line: a JSON example of the kind's exact props, then (when to use it). Keep examples
// realistic — the director copies their shape.
export function sceneCatalog(maxCustom: number): string {
  return `SCENE KINDS
text:
- {"kind":"headline","text":"3-6 word hook","emphasis":"ONE word","kicker":"optional label"}
- {"kind":"decrypt","text":"short line that scramble-reveals","sub":"optional","kicker":"optional"}  (great hook/reveal)
- {"kind":"callout","text":"punchy line.","emphasis":"word"}
- {"kind":"quote","pre":"my Opus sub is now","boxed":"emotional support","post":""}
data (real numbers only):
- {"kind":"stat","value":"3,000","label":"API operations covered","kicker":"cf covers","prev":"280"}  (hero number — digits roll in like an odometer; prev = optional REAL old value shown struck "was 280")
- {"kind":"statrow","items":[{"value":"3x","label":"faster"},{"value":"$3","label":"per M tokens"}],"kicker":"optional"}
- {"kind":"linechart","title":"swe-bench over time","values":[40,55,72,90],"caption":"straight up"}
- {"kind":"barchart","title":"price / M tokens","unit":"$","rows":[{"label":"Opus","value":15,"brand":"Claude"},{"label":"Sonnet 5","value":3,"hero":true,"note":"5x cheaper"}]}  (brand = logo under the bar; note = chip on the hero bar, only if true)
- {"kind":"donut","percent":90,"label":"as good as Opus","kicker":"benchmarks"}
- {"kind":"table","title":"the lineup","columns":["model","score","price"],"rows":[{"label":"Sonnet 5","values":["78%","$3"],"hero":true},{"label":"GPT-5","values":["72%","$10"]}]}
ui:
- {"kind":"bento","title":"what's new","cells":[{"title":"agentic for hours","sub":"no wandering"},{"title":"200k context","brand":"Anthropic"}]}  (first cell = biggest)
- {"kind":"calendar","month":"January","highlights":[2,3,4,9,10,11,16],"label":"shipping every week"}  (date/frequency beats)
- {"kind":"timeline","title":"how it went","steps":[{"title":"GPT-4 era","sub":"2023"},{"title":"now","sub":"agents everywhere"}]}
- {"kind":"chat","app":"claude","messages":[{"role":"user","text":"ship the feature"},{"role":"ai","text":"done. deployed to prod."}]}  (AI convo beats)
- {"kind":"notifications","items":[{"app":"Anthropic","title":"Sonnet 5 released","body":"3x faster","brand":"Anthropic"}]}  (news-drop beats, up to 3)
- {"kind":"checklist","title":"the gist","items":["faster","cheaper","smarter"]}
- {"kind":"kbd","keys":["⌘","K"],"label":"that's it. that's the feature."}
media (real assets):
- {"kind":"logo","name":"Claude","tagline":"Sonnet 5"}  (company WITH a logo; model names go in tagline)
- {"kind":"logowall","title":"everyone's on it","brands":["Cursor","GitHub","Perplexity","Vercel"]}
- {"kind":"versus","a":"Anthropic","b":"OpenAI","aNote":"$3 / M","bNote":"$15 / M"}  (a = the winner)
- {"kind":"browser","url":"https://cursor.com","label":"cursor.com"}  (REAL site screenshot — USE OFTEN)
    great for: launch/announcement posts (https://anthropic.com/news/..., https://openai.com/index/...),
    docs pages, pricing pages, blog posts, and GitHub repos (https://github.com/org/repo).
    Reach for this on almost every video that references a real page — 1-2 per reel ideal.
- {"kind":"phone","url":"https://anthropic.com","label":"optional"}  (same, framed in a phone)
- {"kind":"ascii","brand":"Claude","label":"optional"}  (logo/image dissolves into glowing ascii — 1 max, hero moment)
- {"kind":"terminal","title":"zsh","lines":["claude -p \\"ship it\\"","done in 4s"]}
- {"kind":"code","title":"agent.ts","lines":["const r = await claude.run(task)","// runs for hours"],"highlight":[1]}
- {"kind":"tweet","name":"a dev","handle":"handle","text":"realistic hot take","brand":"Anthropic"}
app ui (shadcn-grade product surfaces — great for "using the tool" beats):
- {"kind":"command","query":"deploy to prod","results":[{"title":"Deploy","sub":"ship it","brand":"Vercel"},{"title":"Rollback"}],"pick":0,"hint":"optional line under"}  (⌘K palette: query types, selection walks to results[pick], ↵ confirms it)
- {"kind":"prompt","text":"build me a CRM. take your time.","app":"claude","sub":"optional"}  (THE-prompt-that-did-this beats; big input, types + sends)
- {"kind":"search","query":"is my job safe","suggestions":["is my job safe from ai","...as a dev"],"label":"optional"}  (search bar + suggestions)
- {"kind":"diff","title":"agent.ts","lines":[{"text":"const model = 'gpt-4'","type":"del"},{"text":"const model = 'sonnet-5'","type":"add"},{"text":"await run()","type":"ctx"}]}  (code before/after beats)
- {"kind":"pricing","tiers":[{"name":"Pro","price":"$20","per":"/month","features":["unlimited"],"hero":true},{"name":"API","price":"$3","per":"/M tokens"}]}  (cost/paywall beats, real prices only)
- {"kind":"leaderboard","title":"swe-bench","rows":[{"label":"Sonnet 5","value":"78%","brand":"Anthropic","hero":true},{"label":"GPT-5","value":"72%"}]}  (rankings/benchmarks — real numbers)
- {"kind":"progress","label":"training run","percent":87,"sub":"optional"}  (one big animated bar + counting %)
- {"kind":"toggles","title":"optional","items":[{"label":"agent mode","on":true},{"label":"guardrails","on":false}]}  (settings switches flip on)
- {"kind":"dashboard","cards":[{"label":"users","value":"2.4M","delta":"+18%","spark":[3,5,4,8,12]},{"label":"cost","value":"$0.02","delta":"-40%"}]}  (2-4 KPI cards w/ sparklines, real numbers)
- {"kind":"receipt","title":"YOUR API BILL","items":[{"label":"input tokens","value":"$12.40"},{"label":"thinking","value":"$88.00"}],"total":{"value":"$100.40"}}  (deadpan cost-breakdown humor)
- {"kind":"inbox","items":[{"from":"OpenAI","subject":"We need to talk","preview":"optional","unread":true,"brand":"OpenAI"}]}  (email-drop beats, up to 4)
- {"kind":"poll","question":"optional","options":[{"label":"ship it","percent":78,"hero":true},{"label":"add tests first","percent":22}]}  (community-verdict beats)
- {"kind":"ticker","rows":[{"symbol":"NVDA","label":"optional","value":"$1,240","delta":"+4.2%"},{"symbol":"GPU","value":"sold out","delta":"-100%"}]}  (market/price-moves beats)
- {"kind":"kanban","title":"optional","columns":[{"title":"todo","cards":["auth"]},{"title":"doing","cards":["tests"]},{"title":"done","cards":["everything else","shipped by the agent"]}]}  (agents-doing-work beats; last card of last column lands late with the glow)
- {"kind":"waveform","label":"optional kicker","sub":"optional"}  (voice/audio-AI beats — animated voice bars)
- {"kind":"rating","name":"Claude Code","rating":4.9,"count":"12,404 ratings","brand":"Anthropic","tagline":"optional"}  (app-store verdict card)
tool review (the arc of a TOOL video: what it is → how you get it → watching it work → the catch → where to find it):
- {"kind":"toolcard","name":"Claude Code","tagline":"one-line what-it-is","brand":"Claude","by":"Anthropic","chips":["CLI","macOS · Linux","free tier"],"badge":"new"}  (the spec sheet — logo draws itself, meta chips; first chip = accent. facts only)
    model release? add "specs":[{"label":"context","value":"1M tokens"},{"label":"price","value":"$3 / M in"}]  (≤4 REAL spec rows, first one glows)
- {"kind":"install","title":"optional","steps":[{"title":"install it","cmd":"npm i -g @anthropic-ai/claude-code"},{"title":"open your repo","cmd":"cd my-app && claude"},{"title":"that's it","sub":"optional"}]}  (getting-started stepper; commands type, rings tick in sequence — REAL commands only, ≤4 steps)
- {"kind":"runlog","title":"claude \\"fix the failing tests\\"","steps":[{"text":"reading the repo"},{"text":"patched auth.ts","detail":"optional"},{"text":"running tests","detail":"optional"}],"result":{"text":"tests green","sub":"optional"}}  (WATCH-IT-WORK beat: task log streams, spinners→ticks, result slams in accent; details = real facts)
- {"kind":"beforeafter","title":"optional","rows":[{"before":"3 hours in Figma","after":"one prompt"},{"before":"a $200 Zapier plan","after":"a 40-line script"}]}  (WHAT-IT-REPLACES beat: old way struck through, new way springs in; ≤4 rows, real numbers only)
- {"kind":"catch","kicker":"the catch","items":[{"text":"$20 a month","sub":"optional"},{"text":"Chrome only"}],"verdict":"still worth it"}  (the fine print — 1-3 caveats thud in, optional verdict chip)
- {"kind":"getit","url":"github.com/anthropics/claude-code","name":"Claude Code","brand":"Claude","badges":["GitHub","npm","Homebrew"],"price":"free","note":"optional line under"}  (CLOSING card: URL types + glows, real distribution badges (GitHub/npm/Homebrew/PyPI/App Store/Chrome Web Store), price chip if real)
v3 — the automation-creator vocabulary (Nick-Saraev-grade; each one moves through a long hold on its own):
- {"kind":"flow","title":"lead → reply in 40s","nodes":[{"label":"New form lead","sub":"webhook"},{"label":"Claude","brand":"Claude","sub":"qualify + draft"},{"label":"Gmail","brand":"Gmail","sub":"send reply"},{"label":"Slack","brand":"Slack","sub":"ping sales"}]}
    (THE workflow graph — n8n-style nodes with real logos on a dotted canvas; the workflow RUNS: a packet travels each edge, nodes light up with a check, then data keeps flowing. 2-7 nodes, labels ≤ 2-3 words.
     Edges default to a chain in node order; branch with "edges":[[0,1],[1,2],[1,3]] (indices). Nodes with no logo get a glyph from their words: schedule/cron, webhook/trigger, email, if/filter, code, http/api/scrape, db/sheet, doc, chat.
     Use for ANY "here's how the automation works" / "it connects X to Y" beat. 1 per reel, hold it 5-8s.)
- {"kind":"cursor","app":"Claude","title":"Settings · Connectors","items":[{"label":"GitHub","brand":"GitHub","sub":"repos, issues, PRs"},{"label":"Slack","brand":"Slack"},{"label":"Notion","brand":"Notion"}],"clicks":[0,2],"action":"Connect","done":"Connected","result":"2 connectors live"}
    (someone USING the product: a real pointer glides in and clicks each items[clicks[i]] button (press + ripple), it flips to 'done', then the 'result' toast lands. ≤5 items, ≤4 clicks. Great for "you just turn it on" / "install the extension" / "connect your accounts" beats.)
- {"kind":"highlight","url":"https://github.com/org/repo","label":"github.com/org/repo","box":{"x":0.05,"y":0.12,"w":0.6,"h":0.08},"note":"the line that matters"}
    (a REAL page screenshot: it loads, the camera ZOOMS into 'box' (fractions of a 1280×1600 viewport screenshot: x,y = top-left, w,h = size, all 0-1), a highlighter box draws while the rest dims, 'note' pops beside it.
     Only use when you know roughly where the thing is (hero headline ≈ y 0.08-0.25; GitHub repo name/description ≈ y 0.1-0.2); omit box to zoom the hero area. "style":"underline" = marker underline instead of a box.)
- {"kind":"json","method":"POST","title":"/v1/messages","status":"200 OK","data":{"id":"msg_01","model":"claude-sonnet-5","stop_reason":"end_turn","usage":{"input_tokens":1204,"output_tokens":88}},"highlight":["model"]}
    (an API call: spinner while in flight, status pill lands, the pretty-printed response STREAMS in with syntax colour, 'highlight' keys get an accent band. ≤15 lines of JSON. Use for "look what the API returns" / structured-output beats. Values must be realistic for the real API.)
- {"kind":"stack","title":"what it replaces","items":[{"label":"Zapier","brand":"Zapier","note":"$20/mo"},{"label":"Calendly","brand":"Calendly","note":"$12/mo"},{"label":"Typeform","brand":"Typeform"}],"into":{"label":"n8n","brand":"n8n","sub":"one self-hosted workflow"}}
    (many tools COLLAPSE into one: the grid of tools flies into the centre, the replacement slams in with a ripple, the old logos line up struck through under it. 2-6 items; notes = REAL prices or omit.)
- {"kind":"kinetic","text":"your agent doesn't need to know the commands","emphasis":"commands","kicker":"optional"}
    (kinetic typography — the line lands WORD BY WORD with his voice, emphasis word(s) in the accent with a drawn underline. The strongest text kind for a punchline/claim; ≤ 10 words; don't put two text kinds back to back.)
- {"kind":"split","title":"same task, two tools","left":{"title":"Wrangler","items":["~280 operations","memorise commands"]},"right":{"title":"cf","brand":"Cloudflare","items":["3,000+ operations","search in English"]},"winner":"right"}
    (two-column compare: lines land alternately, winner side gets accent ticks + glow, loser faint crosses. ≤4 lines a side, facts only. Richer than versus (logos + one number) — use when there are 2-4 differences.)
- {"kind":"logoorbit","center":"Claude","brands":["GitHub","Slack","Notion","Linear","Figma","Stripe"],"label":"one protocol, every tool"}
    (a hub and what it connects to: the center mark draws, satellites pop onto a turning ring, packets pulse out along the spokes. 4-8 brands. MCP / integrations / "works with everything" beats.)
- {"kind":"repo","repo":"cloudflare/cf","description":"The Cloudflare CLI, rebuilt for agents.","stars":"12,480","forks":"640","language":"TypeScript","topics":["cli","agents"],"today":"+2,140 today","spark":[120,900,2400,5200,12480]}
    (a GitHub repo blowing up: the Star button gets clicked, the REAL star count rolls up like an odometer, trending chip, star-history sparkline. stars REQUIRED and REAL (from the research); drop forks/today/spark unless you have the real numbers.)
bespoke (use sparingly — it will be CODE-GENERATED for this video, then verified):
- {"kind":"custom","name":"PascalCaseName","spec":"one tight paragraph: exactly what to show and how it animates","props":{...any data it needs...}}
  (it's built from the kit — src/auto/kit.tsx: Surface/Window cards, typing text, counters/odometer, edges with flowing packets, a clicking cursor, highlight boxes, logo tiles, tick lists — so a spec can say "a cursor clicks X", "packets flow from A to B", "the number rolls up".)
  ONLY when no kind above fits the beat. Up to ${maxCustom} per video — a ceiling, NOT a quota: most
  videos need zero, one is normal for a hero moment, three only when three beats genuinely
  have no fit. Great for topic-specific visuals (e.g. a token-price ticker, a model-router
  diagram, a fake app UI specific to the story).

`;
}
