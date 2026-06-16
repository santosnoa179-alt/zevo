import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { KineticText } from "../components/KineticText";
import { COLORS, FPS } from "../constants";

/**
 * ProblemScene — 0s → 8s
 * 8 kinetic slams, one per second, ending with "ÇA SUFFIT." in orange.
 */
const words: { t: string; color?: string; glitch?: boolean; size?: number }[] = [
  { t: "Trop de clients.", glitch: true },
  { t: "Pas assez de temps.", glitch: true },
  { t: "Des Excel partout." },
  { t: "Des repas non suivis.", color: COLORS.primaryLight },
  { t: "WhatsApp qui sature." },
  { t: "Des paiements en retard.", color: COLORS.red },
  { t: "Des clients qui partent.", color: COLORS.red },
  { t: "ÇA SUFFIT.", color: COLORS.primary, size: 220 },
];

export const ProblemScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {words.map((w, i) => (
        <Sequence key={i} from={i * FPS} durationInFrames={FPS}>
          <KineticText
            text={w.t}
            color={w.color}
            glitch={w.glitch}
            size={w.size ?? 160}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
