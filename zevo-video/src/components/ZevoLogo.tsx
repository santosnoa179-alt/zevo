import React from "react";
import { COLORS, FONTS } from "../constants";

type Props = {
  size?: number;
  glow?: boolean;
};

/**
 * ZevoLogo — minimal wordmark used in Reveal + Result scenes.
 * Replace the <span> with an <Img> of your actual SVG logo if desired.
 */
export const ZevoLogo: React.FC<Props> = ({ size = 180, glow = true }) => {
  return (
    <div
      style={{
        fontFamily: FONTS.display,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: "-0.05em",
        color: COLORS.text,
        textShadow: glow
          ? `0 0 80px ${COLORS.primary}60, 0 0 140px ${COLORS.primary}30`
          : undefined,
        display: "flex",
        alignItems: "center",
      }}
    >
      <span>Zev</span>
      <span style={{ color: COLORS.primary }}>o</span>
      <span
        style={{
          display: "inline-block",
          width: size * 0.08,
          height: size * 0.08,
          borderRadius: "50%",
          background: COLORS.primary,
          marginLeft: size * 0.05,
          marginTop: size * 0.6,
          boxShadow: glow ? `0 0 40px ${COLORS.primary}` : undefined,
        }}
      />
    </div>
  );
};
