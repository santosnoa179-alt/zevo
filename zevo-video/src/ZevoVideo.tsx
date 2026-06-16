import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { InActionScene } from "./scenes/InActionScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { ResultScene } from "./scenes/ResultScene";
import { RevealScene } from "./scenes/RevealScene";
import { COLORS, FPS, SCENE_TIMING, secToFrames } from "./constants";

type Props = {
  /** "landscape" = 1920x1080, "portrait" = 1080x1920 */
  orientation: "landscape" | "portrait";
};

/**
 * Main 30-second Zevo promotional video.
 *
 * Structure (30s / 900 frames @ 30fps):
 *   0–8s   ProblemScene   (kinetic typography)
 *   8–12s  RevealScene    (logo + tagline)
 *   12–25s InActionScene  (UI beats, hero = client tracking)
 *   25–30s ResultScene    (benefits + CTA)
 *
 * The composition is orientation-aware: in portrait we scale the central
 * stage down slightly so desktop mocks stay readable in 9:16.
 */
export const ZevoVideo: React.FC<Props> = ({ orientation }) => {
  const portraitScale = orientation === "portrait" ? 0.6 : 1;

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Voiceover track — drop a file at public/voiceover.mp3 to enable */}
      {/*
      <Audio src={staticFile("voiceover.mp3")} />
      */}

      <AbsoluteFill
        style={{
          transform: `scale(${portraitScale})`,
          transformOrigin: "center",
        }}
      >
        <Sequence
          from={secToFrames(SCENE_TIMING.problem.start)}
          durationInFrames={secToFrames(
            SCENE_TIMING.problem.end - SCENE_TIMING.problem.start
          )}
          name="Problem"
        >
          <ProblemScene />
        </Sequence>

        <Sequence
          from={secToFrames(SCENE_TIMING.reveal.start)}
          durationInFrames={secToFrames(
            SCENE_TIMING.reveal.end - SCENE_TIMING.reveal.start
          )}
          name="Reveal"
        >
          <RevealScene />
        </Sequence>

        <Sequence
          from={secToFrames(SCENE_TIMING.inAction.start)}
          durationInFrames={secToFrames(
            SCENE_TIMING.inAction.end - SCENE_TIMING.inAction.start
          )}
          name="InAction"
        >
          <InActionScene />
        </Sequence>

        <Sequence
          from={secToFrames(SCENE_TIMING.result.start)}
          durationInFrames={secToFrames(
            SCENE_TIMING.result.end - SCENE_TIMING.result.start
          )}
          name="Result"
        >
          <ResultScene />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Silence unused-import warning while the Audio line above is commented out
export const _unused = { Audio, staticFile, FPS };
