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
 * ResultScene — 25s → 30s (5 seconds).
 * 0:00–0:02  Benefit lines slam in
 * 0:02–0:05  Logo + CTA
 */
export const ResultScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: benefits (0 → 60 frames)
  const benefitsOpacity = interpolate(frame, [0, 8, 55, 60], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  // Phase 2: logo + CTA (from frame 60)
  const logoShow = spring({
    frame: frame - 60,
    fps,
    config: { damping: 14, stiffness: 120 },
    from: 0,
    to: 1,
  });

  const ctaY = interpolate(frame, [75, 95], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaOpacity = interpolate(frame, [75, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background gradient grows in phase 2
  const gradientOpacity = interpolate(frame, [60, 90], [0, 0.6], {
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
      {/* gradient bloom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center bottom, ${COLORS.primary}30 0%, transparent 55%)`,
          opacity: gradientOpacity,
        }}
      />

      {/* Phase 1 — Benefits */}
      {frame < 65 && (
        <div
          style={{
            opacity: benefitsOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            fontFamily: FONTS.display,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 100, color: COLORS.text }}>
            <span style={{ color: COLORS.primary }}>+</span> de fidélité.
          </div>
          <div style={{ fontSize: 100, color: COLORS.text }}>
            <span style={{ color: COLORS.primary }}>−</span> de stress.
          </div>
        </div>
      )}

      {/* Phase 2 — Logo + CTA */}
      {frame >= 55 && (
        <div
          style={{
            opacity: logoShow,
            transform: `scale(${0.9 + logoShow * 0.1})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 36,
          }}
        >
          <ZevoLogo size={180} glow />
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 36,
              fontWeight: 600,
              color: COLORS.text,
              letterSpacing: "-0.02em",
            }}
          >
            Coach mieux. Vis mieux.
          </div>
          <div
            style={{
              opacity: ctaOpacity,
              transform: `translateY(${ctaY}px)`,
              marginTop: 10,
              padding: "18px 42px",
              background: COLORS.primary,
              color: "#0a0a0a",
              fontFamily: FONTS.body,
              fontWeight: 700,
              fontSize: 22,
              borderRadius: 999,
              boxShadow: `0 0 50px ${COLORS.primary}60`,
            }}
          >
            Essayer gratuitement → zevo.app
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
