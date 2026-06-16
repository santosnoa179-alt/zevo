import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ZevoLogo } from "../components/ZevoLogo";
import { COLORS, FONTS } from "../constants";

/**
 * RevealScene — 8s → 12s (4 seconds).
 * Logo fades in, tagline slides up after ~1s.
 */
export const RevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 120 },
    from: 0.85,
    to: 1,
  });

  const taglineOpacity = interpolate(frame, [35, 55], [0, 1], {
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [35, 55], [20, 0], {
    extrapolateRight: "clamp",
  });

  // Subtle radial glow behind logo
  const glowOpacity = interpolate(frame, [0, 30], [0, 0.5], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}40 0%, transparent 60%)`,
          opacity: glowOpacity,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
        }}
      >
        <ZevoLogo size={200} glow />
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            fontFamily: FONTS.body,
            fontSize: 28,
            fontWeight: 300,
            color: COLORS.textMuted,
            letterSpacing: "0.02em",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          La plateforme tout-en-un pour coachs sport & nutrition.
        </div>
      </div>
    </AbsoluteFill>
  );
};
