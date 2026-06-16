import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../constants";

/**
 * MockUI — a suite of lightweight Zevo UI "mockups" rendered in pure React.
 * Each mock is a self-contained card so scenes can zoom/position them freely.
 *
 * These aren't 1:1 screenshots; they're stylized rebuilds that feel on-brand,
 * render fast, and animate smoothly at 30fps.
 */

// ----- Shared chrome ---------------------------------------------------------

const Chrome: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ children, width = 1100, height = 680 }) => (
  <div
    style={{
      width,
      height,
      background: COLORS.bgElevated,
      borderRadius: 20,
      border: `1px solid ${COLORS.border}`,
      boxShadow:
        "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      fontFamily: FONTS.body,
      color: COLORS.text,
    }}
  >
    {/* fake titlebar */}
    <div
      style={{
        height: 32,
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 6,
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div
          key={c}
          style={{ width: 11, height: 11, borderRadius: "50%", background: c }}
        />
      ))}
    </div>
    <div style={{ flex: 1, display: "flex" }}>{children}</div>
  </div>
);

const Sidebar: React.FC = () => {
  const items = [
    { label: "Dashboard", color: COLORS.blue, active: false },
    { label: "Clients", color: COLORS.purple, active: true },
    { label: "Calendrier", color: COLORS.green, active: false },
    { label: "Messages", color: "#06B6D4", active: false },
    { label: "Sport", color: COLORS.red, active: false },
    { label: "Nutrition", color: COLORS.green, active: false },
    { label: "Paiements", color: COLORS.amber, active: false },
  ];
  return (
    <div
      style={{
        width: 220,
        background: "#0a0a0a",
        borderRight: `1px solid ${COLORS.border}`,
        padding: "18px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: COLORS.text,
          padding: "8px 10px 20px",
        }}
      >
        Zev<span style={{ color: COLORS.primary }}>o</span>
      </div>
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: it.active ? "rgba(255,107,43,0.08)" : "transparent",
            color: it.active ? COLORS.primary : COLORS.textMuted,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: `${it.color}22`,
              border: `1px solid ${it.color}44`,
              display: "grid",
              placeItems: "center",
              color: it.color,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {it.label[0]}
          </div>
          {it.label}
        </div>
      ))}
    </div>
  );
};

// ----- 1. Dashboard ---------------------------------------------------------

export const DashboardMock: React.FC = () => {
  const frame = useCurrentFrame();
  const clients = Math.round(interpolate(frame, [0, 30], [0, 42], { extrapolateRight: "clamp" }));
  const revenue = Math.round(interpolate(frame, [0, 30], [0, 4280], { extrapolateRight: "clamp" }));
  const seances = Math.round(interpolate(frame, [0, 30], [0, 18], { extrapolateRight: "clamp" }));

  const Stat: React.FC<{ label: string; value: string; color: string }> = ({
    label,
    value,
    color,
  }) => (
    <div
      style={{
        flex: 1,
        background: COLORS.bgCard,
        borderRadius: 14,
        padding: 22,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div style={{ color: COLORS.textMuted, fontSize: 13 }}>{label}</div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: COLORS.text,
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 10, height: 4, background: "#222", borderRadius: 4 }}>
        <div style={{ width: "72%", height: "100%", background: color, borderRadius: 4 }} />
      </div>
    </div>
  );

  return (
    <Chrome>
      <Sidebar />
      <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Tableau de bord
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <Stat label="Clients actifs" value={`${clients}`} color={COLORS.purple} />
          <Stat label="Revenus du mois" value={`${revenue.toLocaleString("fr-FR")} €`} color={COLORS.primary} />
          <Stat label="Séances cette semaine" value={`${seances}`} color={COLORS.green} />
        </div>
        <div
          style={{
            flex: 1,
            background: COLORS.bgCard,
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            padding: 24,
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          {[38, 52, 44, 68, 55, 78, 82, 72, 88, 92, 86, 95].map((h, i) => {
            const grow = interpolate(frame, [i * 2, i * 2 + 18], [0, h], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${grow}%`,
                  background: `linear-gradient(180deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
                  borderRadius: 6,
                }}
              />
            );
          })}
        </div>
      </div>
    </Chrome>
  );
};

// ----- 2. Client Tracking (HERO) -------------------------------------------

export const ClientTrackingMock: React.FC = () => {
  const frame = useCurrentFrame();
  // Animate weight chart line
  const chartProgress = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });
  // Animate wellbeing circle
  const wellbeing = Math.round(interpolate(frame, [0, 40], [0, 87], { extrapolateRight: "clamp" }));
  const circleDash = interpolate(frame, [0, 40], [283, 283 * (1 - 87 / 100)], { extrapolateRight: "clamp" });

  // Weight chart path
  const points = [
    [0, 60],
    [40, 55],
    [80, 58],
    [120, 48],
    [160, 42],
    [200, 38],
    [240, 32],
    [280, 28],
    [320, 22],
  ];
  const totalLen = 320;
  const visibleLen = totalLen * chartProgress;

  return (
    <Chrome>
      <Sidebar />
      <div style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* header with client */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
              display: "grid",
              placeItems: "center",
              fontSize: 22,
              fontWeight: 800,
              color: COLORS.text,
              fontFamily: FONTS.display,
            }}
          >
            ML
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display }}>
              Marie Lefèvre
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: 13 }}>
              Perte de poids · Programme depuis 12 semaines
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, flex: 1 }}>
          {/* Weight chart */}
          <div
            style={{
              flex: 2,
              background: COLORS.bgCard,
              borderRadius: 14,
              border: `1px solid ${COLORS.border}`,
              padding: 20,
              position: "relative",
            }}
          >
            <div style={{ color: COLORS.textMuted, fontSize: 12 }}>ÉVOLUTION POIDS</div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: FONTS.display, marginTop: 4 }}>
              68,4 kg <span style={{ color: COLORS.green, fontSize: 14 }}>-7,6 kg</span>
            </div>
            <svg viewBox="0 0 340 90" style={{ width: "100%", height: 120, marginTop: 10 }}>
              <defs>
                <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              {/* line */}
              <polyline
                fill="none"
                stroke={COLORS.primary}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points.map(([x, y]) => `${x},${y}`).join(" ")}
                strokeDasharray={`${visibleLen} ${totalLen}`}
              />
              {/* area */}
              <polygon
                fill="url(#wg)"
                opacity={chartProgress}
                points={`${points.map(([x, y]) => `${x},${y}`).join(" ")} 320,90 0,90`}
              />
            </svg>
          </div>

          {/* Wellbeing circle */}
          <div
            style={{
              flex: 1,
              background: COLORS.bgCard,
              borderRadius: 14,
              border: `1px solid ${COLORS.border}`,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ color: COLORS.textMuted, fontSize: 12 }}>BIEN-ÊTRE</div>
            <svg width={140} height={140} style={{ marginTop: 8 }}>
              <circle
                cx={70}
                cy={70}
                r={45}
                fill="none"
                stroke="#222"
                strokeWidth={10}
              />
              <circle
                cx={70}
                cy={70}
                r={45}
                fill="none"
                stroke={COLORS.primary}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={283}
                strokeDashoffset={circleDash}
                transform="rotate(-90 70 70)"
              />
              <text
                x={70}
                y={80}
                textAnchor="middle"
                fontFamily={FONTS.display}
                fontWeight={800}
                fontSize={32}
                fill={COLORS.text}
              >
                {wellbeing}
              </text>
            </svg>
          </div>
        </div>

        {/* Nutrition journal row */}
        <div
          style={{
            background: COLORS.bgCard,
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            padding: 18,
            display: "flex",
            gap: 14,
          }}
        >
          <div style={{ color: COLORS.textMuted, fontSize: 12, flex: 1 }}>
            JOURNAL NUTRITION · AUJOURD'HUI
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: COLORS.text,
                fontFamily: FONTS.display,
                marginTop: 4,
              }}
            >
              1 847 / 2 000 kcal
            </div>
          </div>
          {[
            { l: "Protéines", v: "142g", c: COLORS.primary },
            { l: "Glucides", v: "186g", c: COLORS.amber },
            { l: "Lipides", v: "58g", c: COLORS.green },
          ].map((m) => (
            <div key={m.l} style={{ minWidth: 100 }}>
              <div style={{ color: COLORS.textMuted, fontSize: 11 }}>{m.l}</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: m.c,
                  fontFamily: FONTS.display,
                  marginTop: 2,
                }}
              >
                {m.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Chrome>
  );
};

// ----- 3. Payments ----------------------------------------------------------

export const PaymentsMock: React.FC = () => {
  const frame = useCurrentFrame();
  const toastOpacity = interpolate(frame, [20, 30, 80, 90], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <Chrome>
      <Sidebar />
      <div style={{ flex: 1, padding: 32 }}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Paiements
        </div>
        <div
          style={{
            marginTop: 20,
            background: COLORS.bgCard,
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            padding: 24,
          }}
        >
          <div style={{ color: COLORS.textMuted, fontSize: 12 }}>SOLDE DISPONIBLE</div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 52,
              fontWeight: 800,
              color: COLORS.text,
              letterSpacing: "-0.03em",
            }}
          >
            4 280,00 €
          </div>
        </div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { name: "Marie L.", label: "Abonnement mensuel", amount: "+89 €", new: true },
            { name: "Thomas B.", label: "Programme nutrition", amount: "+149 €", new: false },
            { name: "Léa G.", label: "Coaching 1:1", amount: "+240 €", new: false },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: `${COLORS.primary}20`,
                  display: "grid",
                  placeItems: "center",
                  color: COLORS.primary,
                  fontWeight: 800,
                }}
              >
                {r.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: COLORS.textMuted, fontSize: 12 }}>{r.label}</div>
              </div>
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontWeight: 800,
                  color: COLORS.green,
                }}
              >
                {r.amount}
              </div>
            </div>
          ))}
        </div>
        {/* success toast */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 40,
            background: "#0a2e1a",
            border: `1px solid ${COLORS.green}55`,
            color: COLORS.green,
            padding: "12px 20px",
            borderRadius: 12,
            opacity: toastOpacity,
            fontWeight: 600,
          }}
        >
          ✓ Paiement reçu · +89 €
        </div>
      </div>
    </Chrome>
  );
};

// ----- 4. Messages ----------------------------------------------------------

export const MessagesMock: React.FC = () => {
  return (
    <Chrome>
      <Sidebar />
      <div style={{ flex: 1, display: "flex" }}>
        <div
          style={{
            width: 280,
            borderRight: `1px solid ${COLORS.border}`,
            padding: 16,
          }}
        >
          <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 18, marginBottom: 14 }}>
            Messages
          </div>
          {[
            { n: "Marie L.", m: "Merci pour le programme !", u: true },
            { n: "Thomas B.", m: "J'ai une question sur...", u: false },
            { n: "Léa G.", m: "Photo envoyée 📸", u: false },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "10px 8px",
                borderRadius: 10,
                background: i === 0 ? "rgba(255,107,43,0.08)" : "transparent",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: `${COLORS.primary}20`,
                  color: COLORS.primary,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                }}
              >
                {c.n[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.n}</div>
                <div style={{ color: COLORS.textMuted, fontSize: 12 }}>{c.m}</div>
              </div>
              {c.u && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: COLORS.primary,
                    borderRadius: "50%",
                    marginTop: 6,
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              alignSelf: "flex-start",
              background: COLORS.bgCard,
              padding: "10px 14px",
              borderRadius: 14,
              maxWidth: "70%",
              fontSize: 14,
            }}
          >
            Super séance aujourd'hui 💪
          </div>
          <div
            style={{
              alignSelf: "flex-end",
              background: COLORS.primary,
              padding: "10px 14px",
              borderRadius: 14,
              maxWidth: "70%",
              fontSize: 14,
              color: "#0a0a0a",
              fontWeight: 600,
            }}
          >
            Bravo Marie ! On continue demain 🔥
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              color: COLORS.textMuted,
              fontSize: 12,
              fontStyle: "italic",
            }}
          >
            Marie est en train d'écrire…
          </div>
        </div>
      </div>
    </Chrome>
  );
};

// ----- 5. Mobile phone frame -----------------------------------------------

export const MobileMock: React.FC = () => {
  return (
    <div
      style={{
        width: 340,
        height: 690,
        background: "#000",
        borderRadius: 44,
        padding: 12,
        boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 2px #222",
        border: `2px solid #222`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: COLORS.bg,
          borderRadius: 32,
          overflow: "hidden",
          position: "relative",
          fontFamily: FONTS.body,
          color: COLORS.text,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span>9:41</span>
          <span>●●●</span>
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 26,
            fontWeight: 800,
            marginTop: 24,
            letterSpacing: "-0.02em",
          }}
        >
          Bonjour, Alex
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>
          Tu as 3 séances aujourd'hui
        </div>
        <div
          style={{
            marginTop: 24,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
            borderRadius: 18,
            padding: 18,
            color: "#0a0a0a",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>
            PROCHAINE SÉANCE
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 22,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            Marie L. · 14:00
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>Full body · 60 min</div>
        </div>
        {["Thomas B. · 16:00", "Léa G. · 18:30"].map((x) => (
          <div
            key={x}
            style={{
              marginTop: 12,
              background: COLORS.bgCard,
              borderRadius: 14,
              padding: 14,
              border: `1px solid ${COLORS.border}`,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {x}
          </div>
        ))}
      </div>
    </div>
  );
};
