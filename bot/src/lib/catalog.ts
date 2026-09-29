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
- {"kind":"stat","value":"90%","label":"as good as Opus","kicker":"benchmarks"}  (giant counter)
- {"kind":"statrow","items":[{"value":"3x","label":"faster"},{"value":"$3","label":"per M tokens"}],"kicker":"optional"}
- {"kind":"linechart","title":"swe-bench over time","values":[40,55,72,90],"caption":"straight up"}
- {"kind":"barchart","title":"price / M tokens","unit":"$","rows":[{"label":"Opus","value":15},{"label":"Sonnet 5","value":3,"hero":true}]}
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
- {"kind":"command","query":"deploy to prod","results":[{"title":"Deploy","sub":"ship it","brand":"Vercel"},{"title":"Rollback"}],"hint":"optional line under"}  (⌘K palette, query types itself)
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
- {"kind":"toolcard","name":"Claude Code","tagline":"one-line what-it-is","brand":"Claude","by":"Anthropic","chips":["CLI","macOS · Linux","free tier"]}  (the spec sheet — logo pops, meta chips; first chip = accent. facts only)
- {"kind":"install","title":"optional","steps":[{"title":"install it","cmd":"npm i -g @anthropic-ai/claude-code"},{"title":"open your repo","cmd":"cd my-app && claude"},{"title":"that's it","sub":"optional"}]}  (getting-started stepper; commands type, rings tick in sequence — REAL commands only, ≤4 steps)
- {"kind":"runlog","title":"claude \\"fix the failing tests\\"","steps":[{"text":"reading the repo"},{"text":"patched auth.ts","detail":"optional"},{"text":"running tests","detail":"optional"}],"result":{"text":"tests green","sub":"optional"}}  (WATCH-IT-WORK beat: task log streams, spinners→ticks, result slams in accent; details = real facts)
- {"kind":"beforeafter","title":"optional","rows":[{"before":"3 hours in Figma","after":"one prompt"},{"before":"a $200 Zapier plan","after":"a 40-line script"}]}  (WHAT-IT-REPLACES beat: old way struck through, new way springs in; ≤4 rows, real numbers only)
- {"kind":"catch","kicker":"the catch","items":[{"text":"$20 a month","sub":"optional"},{"text":"Chrome only"}],"verdict":"still worth it"}  (the fine print — 1-3 caveats thud in, optional verdict chip)
- {"kind":"getit","url":"github.com/anthropics/claude-code","name":"Claude Code","brand":"Claude","badges":["GitHub","npm","Homebrew"],"price":"free","note":"optional line under"}  (CLOSING card: URL types + glows, real distribution badges (GitHub/npm/Homebrew/PyPI/App Store/Chrome Web Store), price chip if real)
bespoke (use sparingly — it will be CODE-GENERATED for this video, then verified):
- {"kind":"custom","name":"PascalCaseName","spec":"one tight paragraph: exactly what to show and how it animates","props":{...any data it needs...}}
  ONLY when no kind above fits the beat. Up to ${maxCustom} per video — a ceiling, NOT a quota: most
  videos need zero, one is normal for a hero moment, three only when three beats genuinely
  have no fit. Great for topic-specific visuals (e.g. a token-price ticker, a model-router
  diagram, a fake app UI specific to the story).

`;
}
