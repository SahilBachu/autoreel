import * as si from "simple-icons";

// Real brand logos. Pulls SVG paths + brand colors from simple-icons by slug, with custom
// paths for the few important ones simple-icons dropped (OpenAI, GitHub, Gemini) and a clean
// text fallback for anything unknown. The director just names a brand; we render the real mark.

type Icon = { title: string; slug: string; hex: string; path: string };

const BY_SLUG: Record<string, Icon> = {};
for (const v of Object.values(si) as any[]) {
  if (v && typeof v === "object" && v.slug && v.path) BY_SLUG[v.slug] = v as Icon;
}

// hand-added marks (real, widely-distributed brand SVGs) for ones missing from simple-icons
const CUSTOM: Record<string, Icon> = {
  openai: {
    title: "OpenAI", slug: "openai", hex: "000000",
    path: "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z",
  },
  github: {
    title: "GitHub", slug: "github", hex: "181717",
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  gemini: {
    title: "Gemini", slug: "gemini", hex: "1C69FF",
    path: "M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.305 14.305 0 0 0 12 12 14.305 14.305 0 0 0-12 12",
  },
};

const ALIAS: Record<string, string> = {
  chatgpt: "openai", gpt: "openai", gpt4: "openai", gpt5: "openai",
  googlegemini: "gemini",
  copilot: "github", githubcopilot: "github",
  claudeai: "claude", claudecode: "claude",
  huggingface: "", // no clean mark -> text fallback
  metaai: "meta", llama: "meta",
};

export function getLogo(name: string): Icon | null {
  const slug = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!slug) return null;
  const a = ALIAS[slug] ?? slug;
  if (a === "") return null;
  return CUSTOM[a] || BY_SLUG[a] || null;
}

// render a brand logo (real SVG) or a clean text fallback. `color` overrides the brand color
// (e.g. white on dark backgrounds).
export const Logo: React.FC<{ name: string; size?: number; color?: string; mono?: boolean }> = ({ name, size = 120, color, mono }) => {
  const ic = getLogo(name);
  if (!ic) {
    return (
      <span style={{ fontFamily: '"General Sans", system-ui, sans-serif', fontWeight: 700, fontSize: size * 0.46, letterSpacing: "-0.02em", color: color || "#111" }}>
        {name}
      </span>
    );
  }
  const fill = color || (mono ? "currentColor" : "#" + ic.hex);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-label={ic.title}>
      <path d={ic.path} />
    </svg>
  );
};

export function hasLogo(name: string): boolean {
  return getLogo(name) !== null;
}
