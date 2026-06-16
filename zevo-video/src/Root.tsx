import React from "react";
import { Composition } from "remotion";
import { DURATION_IN_FRAMES, FPS } from "./constants";
import { ZevoVideo } from "./ZevoVideo";

/**
 * Root — registers both output formats.
 * - 16:9  → YouTube, site web, Meta Ads landscape
 * - 9:16  → Instagram Reels, TikTok, Shorts
 *
 * Render from CLI:
 *   npm run build:16x9
 *   npm run build:9x16
 */
export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ZevoVideo16x9"
        component={ZevoVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ orientation: "landscape" as const }}
      />
      <Composition
        id="ZevoVideo9x16"
        component={ZevoVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ orientation: "portrait" as const }}
      />
    </>
  );
};
