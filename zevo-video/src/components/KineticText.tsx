import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS } from "../constants";

type Props = {
  text: string;
  color?: string;
  size?: number;
  glitch?: boolean;
  background?: string;
};

/**
 * KineticText — a single word (or short sentence) that slams onto screen,
 * holds, then fades. Used for the "problem" section intro.
 */
export const KineticText: React.FC<Props> = ({
  text,
  color = COLORS.text,
  size = 180,
  glitch = false,
  background = COLORS.bg,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Snap in with spring
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 200 },
    from: 0.7,
    to: 1,
  });

  const opacity = interpolate(frame, [0, 2, 20, 28], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  // Subtle glitch — horizontal jitter every few frames
  const glitchX = glitch && frame % 3 === 0 ? (Math.random() - 0.5) * 6 : 0;
  const glitchY = glitch && frame % 4 === 0 ? (Math.random() - 0.5) * 4 : 0;

  return (
    <AbsoluteFill
      style={{
        background,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 8%",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.display,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 0.95,
          letterSpacing: "-0.04em",
          color,
          textAlign: "center",
          transform: `scale(${scale}) translate(${glitchX}px, ${glitchY}px)`,
          opacity,
          textTransform: "uppercase",
          textShadow:
            color === COLORS.primary
              ? `0 0 60px ${COLORS.primary}80`
              : undefined,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
