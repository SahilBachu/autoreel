import { Img, staticFile } from "remotion";
import type { Insert, ProofData, TweetData, BrollData } from "../types";
import { colors, layout, fonts } from "../style/tokens";

const CARD_WIDTH = 620;

// Shared frosted-glass shell (faked without backdrop-filter for render reliability).
const CardShell: React.FC<{ children: React.ReactNode; kicker?: string }> = ({
  children,
  kicker,
}) => (
  <div
    style={{
      width: CARD_WIDTH,
      borderRadius: layout.cardRadius,
      background: `linear-gradient(180deg, rgba(28,28,34,0.94) 0%, ${colors.cardBg} 100%)`,
      border: `1.5px solid ${colors.cardBorder}`,
      boxShadow: `0 30px 90px -30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)`,
      padding: 40,
      fontFamily: fonts.body,
      color: colors.text,
    }}
  >
    {kicker ? (
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: colors.accent,
          marginBottom: 22,
        }}
      >
        {kicker}
      </div>
    ) : null}
    {children}
  </div>
);

export const ProofCard: React.FC<{ data: ProofData }> = ({ data }) => (
  <CardShell kicker={data.label}>
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {data.rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingBottom: 16,
            borderBottom:
              i < data.rows.length - 1 ? `1px solid ${colors.hairline}` : "none",
          }}
        >
          <span style={{ fontSize: 34, fontWeight: 500, color: colors.textDim }}>
            {r.name}
          </span>
          <span
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: r.highlight ? colors.accent : colors.text,
            }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  </CardShell>
);

export const TweetCard: React.FC<{ data: TweetData }> = ({ data }) => {
  const initials = data.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <CardShell>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            background: colors.accentSoft,
            border: `1.5px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 28,
            color: colors.accent,
            overflow: "hidden",
          }}
        >
          {data.avatar ? (
            <Img
              src={data.avatar.startsWith("http") ? data.avatar : staticFile(data.avatar)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 32, fontWeight: 700 }}>{data.name}</span>
          <span style={{ fontSize: 26, color: colors.textDim }}>{data.handle}</span>
        </div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.32 }}>{data.text}</div>
    </CardShell>
  );
};

export const BrollCard: React.FC<{ data: BrollData }> = ({ data }) => (
  <CardShell>
    <div
      style={{
        width: "100%",
        height: 360,
        borderRadius: layout.cardRadius - 12,
        overflow: "hidden",
        background: `linear-gradient(160deg, #17171c 0%, #0d0d10 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: colors.textFaint,
        fontSize: 28,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {data.src ? (
        <Img
          src={data.src.startsWith("http") ? data.src : staticFile(data.src)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        "b-roll"
      )}
    </div>
    {data.caption ? (
      <div style={{ marginTop: 20, fontSize: 30, color: colors.textDim }}>
        {data.caption}
      </div>
    ) : null}
  </CardShell>
);

export const InsertCard: React.FC<{ insert: Insert }> = ({ insert }) => {
  switch (insert.type) {
    case "proof":
      return <ProofCard data={insert.data} />;
    case "tweet":
      return <TweetCard data={insert.data} />;
    case "broll":
      return <BrollCard data={insert.data} />;
  }
};
