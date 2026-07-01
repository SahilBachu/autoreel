import { AbsoluteFill } from "remotion";
import { colors } from "../../style/tokens";

// Dead-simple flat near-black with a whisper of edge vignette. Maximum restraint.
export const Solid: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.bg }}>
    <AbsoluteFill
      style={{ boxShadow: "inset 0 0 260px 60px rgba(0,0,0,0.55)" }}
    />
  </AbsoluteFill>
);
