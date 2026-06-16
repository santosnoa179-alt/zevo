import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import {
  ClientTrackingMock,
  DashboardMock,
  MessagesMock,
  MobileMock,
  PaymentsMock,
} from "../components/MockUI";
import { COLORS, FONTS, FPS } from "../constants";

/**
 * InActionScene — 12s → 25s (13 seconds).
 * Five UI beats with overlay labels. The client-tracking beat is the hero (5s).
 *
 * Beat layout (within this scene):
 *   0:00 → 0:01  Inscris tes clients        (dashboard stat grow)
 *   0:01 → 0:06  Suis chaque progression.   (HERO — ClientTrackingMock)
 *   0:06 → 0:08  Encaisse en 1 clic         (PaymentsMock)
 *   0:08 → 0:10  Centralise les messages    (MessagesMock)
 *   0:10 → 0:13  Desktop → Mobile           (MobileMock)
 */

const Label: React.FC<{ text: string; color?: string }> = ({
  text,
  color = COLORS.text,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, 22, 28], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 8], [20, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: "8%",
        left: "50%",
        transform: `translateX(-50%) translateY(${y}px)`,
        fontFamily: FONTS.display,
        fontSize: 72,
        fontWeight: 800,
        letterSpacing: "-0.03em",
        color,
        opacity,
        textAlign: "center",
        width: "100%",
        padding: "0 6%",
        textShadow: `0 0 40px rgba(0,0,0,0.8)`,
      }}
    >
      {text}
    </div>
  );
};

const MockStage: React.FC<{
  children: React.ReactNode;
  scale?: number;
}> = ({ children, scale = 1 }) => {
  const frame = useCurrentFrame();
  // Smooth zoom-in
  const zoom = interpolate(frame, [0, 30], [0.92, 1], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 10, 24, 30], [0, 1, 1, 0.95], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: COLORS.bg,
      }}
    >
      <div
        style={{
          transform: `scale(${zoom * scale})`,
          opacity,
          transformOrigin: "center",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const InActionScene: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Beat 1 · 1s — Dashboard */}
      <Sequence from={0} durationInFrames={FPS * 1}>
        <MockStage>
          <DashboardMock />
        </MockStage>
        <Label text="Inscris tes clients." />
      </Sequence>

      {/* Beat 2 · 5s — HERO: Client tracking */}
      <Sequence from={FPS * 1} durationInFrames={FPS * 5}>
        <MockStage scale={1.05}>
          <ClientTrackingMock />
        </MockStage>
        <Label text="Suis chaque progression." color={COLORS.primary} />
      </Sequence>

      {/* Beat 3 · 2s — Payments */}
      <Sequence from={FPS * 6} durationInFrames={FPS * 2}>
        <MockStage>
          <PaymentsMock />
        </MockStage>
        <Label text="Encaisse en 1 clic." />
      </Sequence>

      {/* Beat 4 · 2s — Messages */}
      <Sequence from={FPS * 8} durationInFrames={FPS * 2}>
        <MockStage>
          <MessagesMock />
        </MockStage>
        <Label text="Centralise tout." />
      </Sequence>

      {/* Beat 5 · 3s — Mobile */}
      <Sequence from={FPS * 10} durationInFrames={FPS * 3}>
        <MockStage>
          <MobileMock />
        </MockStage>
        <Label text="Partout avec toi." />
      </Sequence>
    </AbsoluteFill>
  );
};
