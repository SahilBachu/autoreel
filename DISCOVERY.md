# DISCOVERY — where the morning research looks, and what counts as a good find

The bot reads this file every time it researches (the 3am digest, `/discover`, `/idea`). Edit
any list, any time — the next run obeys. The `- name | key: value` lines are parsed; everything
under "## what counts" and "## skip" is handed to the researcher word for word.

## creators

What these people post this week is the best map of what the AI builder community cares about
right now. Their YouTube uploads are pulled from public feeds (no login). The researcher uses
them as a signal — it pitches the underlying thing with sahil's own angle, never "remake this video".

- Nate Herk | youtube: UC2ojq-nuP8ceeHqiroeKhBA
- Jack Roberts | youtube: UCxVxcTULO9cFU6SB9qVaisQ
- Dan Martell | youtube: UCA-mWX9CvCTVFWRMb9bKc9w
- Varun Mayya | youtube: UCsQoiOrh7jzKmE8NBofhTnQ

## subreddits

Top posts of the day, via RSS.

- LocalLLaMA
- ClaudeAI
- ChatGPTCoding
- AI_Agents
- n8n
- SideProject
- singularity

## github

Repos created in the last this-many days, ranked by stars — "new and suddenly popular".

- window | days: 45
- minimum | stars: 150

## hacker news

- show hn | min points: 20
- front page AI stories | min points: 100

## what counts

Anything in AI that the builder community is ACTIVELY talking about right now, the more niche the
better. Not just tools: a Claude/agent skill people are passing around, an MCP server, a repo, a
workflow or automation someone shared, a prompting technique that's spreading, a small product
launch, a weird failure, a pricing change that stings, lab drama, a model release. The test: would
someone who follows Nate Herk / Jack Roberts / r/LocalLLaMA go "oh I saw people talking about
that" — while someone who only reads mainstream tech news hasn't heard of it yet.

Prefer things with a real signal (a creator covered it, a top post, a repo gaining stars fast, a
Show HN with discussion) and prefer things showing up in more than one place. Say where you saw
it in the card's "source".

Aim for about a 50/50 mix of news and tool posts, not tool-first. Pick a tool only when it has a
security or money stake, or a paradox a story can resolve; otherwise prefer a news story with a twist.

**Who it's for (sahil, 2026-10-08):** people who use AI but aren't necessarily developers. The
tools that are working are ones an everyday person can use and have fun with: animation, video,
images, music, game mods, making something without code (ClaudeAnimationBase, universal-modder,
SCM). So a tool a normal person can try in a few minutes also passes the bar above, as long as
it's genuinely new and people are talking about it. Technical and developer stories are still
always welcome; between two equal picks, prefer the one a less technical viewer gets something
out of.

## skip

- The household names as the whole subject: ChatGPT, Claude, Gemini, Copilot, Cursor, Perplexity,
  Midjourney, OpenCode, Ollama, n8n itself. A niche feature, skill, trick or failure OF one of these
  is fine — "Claude Code has this new X" is good, "Claude is an AI assistant" is not.
- Anything older than ~2 weeks unless something new just happened with it.
- Generic listicles ("10 AI tools you need"), courses, and anything that's just an ad.
- Something a daily AI-news reader has already seen five times this week (at most one mega-headline per digest).
- A model catching up to, matching or beating another model on benchmarks or claims (e.g. 'X beats
  Opus', 'Y caught up to GPT'), unless there is a concrete twist with real stakes (money, security,
  someone getting cut off).
