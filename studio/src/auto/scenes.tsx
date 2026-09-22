import React from "react";
import { AsciiImage, Scene as SceneWrap } from "./fx";
import { Callout, Decrypt, Headline, Quote } from "./v2-text";
import { BarChart, Donut, LineChart, Stat, StatRow, Table } from "./v2-data";
import { Bento, CalendarCard, Chat, Checklist, Kbd, Notifications, Timeline } from "./v2-ui";
import { Browser, CodeBlock, LogoDrop, LogoWall, Phone, Terminal, TweetCard, Versus } from "./v2-media";
import {
  CommandK, Dashboard, DiffBlock, Inbox, Kanban, Leaderboard, Poll, Pricing,
  ProgressCard, PromptCard, Rating, Receipt, SearchCard, Ticker, Toggles, Waveform,
} from "./v2-apps";
import { BeforeAfter, Catch, GetIt, Install, RunLog, ToolCard } from "./v2-tools";
import { GENERATED } from "./generated/index";

// ─────────────────────────────────────────────────────────────────────────────
// The director's scene plan → the v2 component for each beat. Shared by BOTH
// renderers (AutoReel = full-screen covers, WorldReel = objects in a camera world).
// Kinds are catalogued in ../../COMPONENTS.md.
// ─────────────────────────────────────────────────────────────────────────────

export type Scene = { kind: string; startMs: number; endMs: number } & Record<string, any>;

/** true when the plan can actually draw this scene (a `custom` needs its generated component). */
export const sceneRenderable = (s: Scene) => {
  if (s.kind === "custom") return Boolean(s.name && GENERATED[s.name]);
  if (s.kind === "browser" || s.kind === "screenshot") return Boolean(s.src);
  return true;
};

export const SceneBody: React.FC<{ s: Scene }> = ({ s }) => {
  switch (s.kind) {
    case "headline":
      return <Headline text={s.text} emphasis={s.emphasis} kicker={s.kicker} overlay={s.overlay} />;
    case "decrypt":
      return <Decrypt text={s.text} sub={s.sub} kicker={s.kicker} overlay={s.overlay} />;
    case "callout":
      return <Callout text={s.text} emphasis={s.emphasis} overlay={s.overlay} />;
    case "quote":
      return <Quote pre={s.pre} boxed={s.boxed} post={s.post} overlay={s.overlay} />;
    case "stat":
      return <Stat value={s.value} label={s.label ?? s.sub} kicker={s.kicker} />;
    case "statrow":
      return <StatRow items={s.items} kicker={s.kicker} />;
    case "linechart":
      return <LineChart title={s.title} values={s.values} caption={s.caption} />;
    case "barchart":
      return <BarChart title={s.title} unit={s.unit} rows={s.rows} />;
    case "donut":
      return <Donut percent={s.percent} label={s.label} kicker={s.kicker} />;
    case "table":
      return <Table title={s.title} columns={s.columns} rows={s.rows} />;
    case "bento":
      return <Bento title={s.title} cells={s.cells} />;
    case "calendar":
      return <CalendarCard month={s.month} highlights={s.highlights} label={s.label} />;
    case "timeline":
      return <Timeline title={s.title} steps={s.steps} />;
    case "chat":
      return <Chat app={s.app} messages={s.messages} />;
    case "notifications":
      return <Notifications items={s.items} />;
    case "checklist":
      return <Checklist title={s.title} items={s.items} />;
    case "kbd":
      return <Kbd keys={s.keys} label={s.label} />;
    case "tweet":
      return <TweetCard name={s.name} handle={s.handle} text={s.text} brand={s.brand} />;
    case "terminal":
      return <Terminal title={s.title} lines={s.lines} />;
    case "code":
      return <CodeBlock title={s.title} lines={s.lines} highlight={s.highlight} />;
    case "browser":
    case "screenshot": // legacy alias
      return s.src ? <Browser src={s.src} label={s.label} /> : null;
    case "phone":
      return <Phone src={s.src} label={s.label} />;
    case "logo":
      return <LogoDrop name={s.name} tagline={s.tagline} src={s.src} />;
    case "logowall":
      return <LogoWall title={s.title} brands={s.brands} />;
    case "versus":
      return <Versus a={s.a} b={s.b} aNote={s.aNote} bNote={s.bNote} />;
    case "ascii":
      return (
        <SceneWrap bg="plain">
          <AsciiImage src={s.src} brand={s.brand} label={s.label} />
        </SceneWrap>
      );
    case "command":
      return <CommandK query={s.query ?? ""} results={s.results} hint={s.hint} />;
    case "diff":
      return <DiffBlock title={s.title} lines={s.lines} />;
    case "pricing":
      return <Pricing title={s.title} tiers={s.tiers} />;
    case "leaderboard":
      return <Leaderboard title={s.title} rows={s.rows} />;
    case "progress":
      return <ProgressCard label={s.label} percent={s.percent} sub={s.sub} />;
    case "toggles":
      return <Toggles title={s.title} items={s.items} />;
    case "dashboard":
      return <Dashboard title={s.title} cards={s.cards} />;
    case "search":
      return <SearchCard query={s.query} suggestions={s.suggestions} label={s.label} />;
    case "receipt":
      return <Receipt title={s.title} items={s.items} total={s.total} />;
    case "waveform":
      return <Waveform label={s.label} sub={s.sub} />;
    case "inbox":
      return <Inbox items={s.items} />;
    case "poll":
      return <Poll question={s.question} options={s.options} />;
    case "ticker":
      return <Ticker title={s.title} rows={s.rows} />;
    case "kanban":
      return <Kanban title={s.title} columns={s.columns} />;
    case "prompt":
      return <PromptCard text={s.text} app={s.app} sub={s.sub} />;
    case "rating":
      return <Rating name={s.name} rating={s.rating} count={s.count} brand={s.brand} tagline={s.tagline} />;
    // tool-review arc (v2-tools.tsx)
    case "toolcard":
      return <ToolCard name={s.name} tagline={s.tagline} brand={s.brand} by={s.by} chips={s.chips} />;
    case "install":
      return <Install title={s.title} steps={s.steps} />;
    case "runlog":
      return <RunLog title={s.title} steps={s.steps} result={s.result} />;
    case "beforeafter":
      return <BeforeAfter title={s.title} beforeLabel={s.beforeLabel} afterLabel={s.afterLabel} rows={s.rows} />;
    case "catch":
      return <Catch kicker={s.kicker} items={s.items} verdict={s.verdict} />;
    case "getit":
      return <GetIt url={s.url} name={s.name} brand={s.brand} badges={s.badges} price={s.price} note={s.note} />;
    case "custom": {
      // bespoke per-video component, code-generated + typechecked at render time
      const C = s.name ? GENERATED[s.name] : undefined;
      return C ? <C {...(s.props ?? {})} /> : null;
    }
    default:
      return null;
  }
};

// a scene that throws (bad director props, buggy generated component) must cost ONLY that
// scene — it degrades to a bare face beat instead of failing the whole render.
export class SceneBoundary extends React.Component<{ kind: string; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: Error) {
    console.error(`scene "${this.props.kind}" crashed — dropped:`, e.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
