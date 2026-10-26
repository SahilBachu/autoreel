import type { DispatchProps } from "./Dispatch";

// The first Dispatch, hand-checked against the sources (block.xyz/dessa; HN item 50213925).
// Doubles as the composition's default props in the Studio.
export const dispatchSample: DispatchProps = {
  issue: 1,
  date: "OCT 25 2026",
  inks: "pinkblue",
  station: ["THE NEWS", "WHAT", "HOW", "SCALE", "REACTION", "THE CATCH", "YOU", "FOLLOW"],
  slides: [
    {
      type: "cover",
      kicker: "AI VOICE",
      headline: "An AI that talks *over you*",
      deck: "The company behind Cash App trained a voice AI on nothing but human conversation. No text at all.",
      image: "carousel/dessa-headline.png",
      imageCaption: "block.xyz/dessa · Block's own words, Oct 2026",
    },
    {
      type: "points",
      title: "What happened",
      points: [
        "Block's AI lab built Dessa from scratch on recordings of people talking. No text, no pretrained models.",
        "It listens and talks at the same time, so it laughs mid-sentence and says “got it” while you're still going.",
        "It runs on a laptop: a MacBook Pro M4 Max or better.",
      ],
    },
    {
      type: "diagram",
      title: "Why it sounds human",
      flows: [
        { label: "Every other voice AI", steps: ["Your voice", "Text", "AI", "Text", "Voice"] },
        { label: "Dessa", steps: ["Your voice", "Dessa", "Its voice"], highlight: true },
      ],
      note: "Turning speech into text throws away the tone, the pauses and the laughter. Dessa never drops them.",
    },
    {
      type: "stat",
      label: "Trained on",
      value: "1 rack",
      sub: "One NVIDIA GB200 NVL72, 72 GPUs. Block says it learned language from hundreds of times fewer words than text models.",
    },
    {
      type: "quote",
      text: "There's no way I would be able to detect if this was AI from the examples alone.",
      who: "Hacker News commenter, on Block's demos",
    },
    {
      type: "split",
      title: "The catch",
      left: { label: "The hype", text: "The most human-sounding voice AI yet, small enough to run on a laptop." },
      right: { label: "The worry", text: "A voice this real is a gift to phone scammers. For now Block is only opening it to safety researchers." },
    },
    {
      type: "takeaways",
      title: "What to do now",
      items: [
        "Agree on a family code word for any call that asks for money.",
        "Ask something only the real person would know.",
        "Hang up and call back on a number you already have.",
      ],
    },
    {
      type: "cta",
      handle: "@21stcentury.sahil",
      line: "The AI news that actually matters, explained like a human would.",
      keyword: "NEWS",
      avatar: "carousel-avatar.jpg",
    },
  ],
};
