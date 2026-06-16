# Zevo — Vidéo promotionnelle (Remotion)

Vidéo de présentation **30 secondes** pour Zevo, construite avec [Remotion](https://www.remotion.dev/).
Export **double format** : 16:9 (YouTube / site) et 9:16 (Reels / TikTok).

---

## 🎬 Structure narrative

| Temps | Scène | Rôle |
|---|---|---|
| 0 → 8s | `ProblemScene` | Typographie cinétique : 8 mots slams sur la douleur du coach |
| 8 → 12s | `RevealScene` | Logo Zevo + tagline |
| 12 → 25s | `InActionScene` | 5 beats UI (hero = **Suivi client** 5s) |
| 25 → 30s | `ResultScene` | Bénéfices + CTA |

---

## 🚀 Installation

```bash
cd "/Users/noasantos/Desktop/Zevo app/zevo-video"

# 1. Installer les dépendances (nécessite Node 18+)
export PATH="/Users/noasantos/.nvm/versions/node/v24.14.0/bin:$PATH"
npm install

# 2. Lancer le Studio Remotion (preview interactive avec timeline)
npm start
```

Le studio s'ouvre sur `http://localhost:3000` — tu peux scrubber la timeline,
prévisualiser chaque scène et ajuster les animations en temps réel.

---

## 📦 Render final

```bash
# 16:9 uniquement (1920×1080) → out/zevo-16x9.mp4
npm run build:16x9

# 9:16 uniquement (1080×1920) → out/zevo-9x16.mp4
npm run build:9x16

# Les deux formats
npm run build:all
```

---

## 🎙️ Voix off

Le script est prêt. Pour l'activer :

1. Enregistre la voix off (FR, voix masculine grave, ~30s) via ElevenLabs, Resemble.ai, ou un studio.
2. Dépose le fichier dans `public/voiceover.mp3`.
3. Ouvre `src/ZevoVideo.tsx` et décommente le bloc `<Audio src={staticFile("voiceover.mp3")} />`.
4. Re-render avec `npm run build:all`.

### Script voix off

| Timing | Texte |
|---|---|
| `0:00–0:08` | *(silence — seuls les mots à l'écran et les notifications stressantes)* |
| `0:08–0:10` | « Zevo. » |
| `0:10–0:12` | « La plateforme tout-en-un pour coachs sport et nutrition. » |
| `0:12–0:17` | « Suis chaque progression. Chaque poids. Chaque repas. Chaque objectif. » |
| `0:17–0:21` | « Crée tes programmes, encaisse tes paiements, centralise tes messages. » |
| `0:21–0:25` | « Le tout, depuis une seule app. Ordinateur ou mobile. » |
| `0:25–0:30` | « Zevo. Coach mieux. Vis mieux. » |

**Réglages recommandés ElevenLabs** : voix `Adam` ou `Josh`, stability 45%, clarity 75%, style exaggeration 20%.

---

## 🎵 Musique

Conseillée : piste électro montante 30s, drop à `0:08`, climax à `0:25`.
Sources libres de droits :
- [Epidemic Sound](https://www.epidemicsound.com/) — cherche "tech upbeat" / "corporate drop"
- [Artlist](https://artlist.io/) — cherche "saas promo"
- [Uppbeat](https://uppbeat.io/) — gratuit avec attribution

Pour ajouter la musique : même process que la voix off (`public/music.mp3` + `<Audio src={staticFile("music.mp3")} volume={0.35} />`).

---

## 🏗️ Architecture

```
zevo-video/
├── src/
│   ├── index.ts              → registerRoot
│   ├── Root.tsx              → enregistre 16:9 + 9:16
│   ├── ZevoVideo.tsx         → composition principale (assemble les 4 scènes)
│   ├── constants.ts          → COLORS, FONTS, timings
│   ├── components/
│   │   ├── KineticText.tsx   → mot unique qui slam
│   │   ├── ZevoLogo.tsx      → wordmark animé
│   │   └── MockUI.tsx        → 5 mockups UI Zevo (Dashboard, Tracking, Payments, Messages, Mobile)
│   └── scenes/
│       ├── ProblemScene.tsx
│       ├── RevealScene.tsx
│       ├── InActionScene.tsx
│       └── ResultScene.tsx
├── remotion.config.ts
├── tsconfig.json
└── package.json
```

---

## 🎨 Customisation rapide

- **Couleurs** : `src/constants.ts` → `COLORS`
- **Durées de scènes** : `src/constants.ts` → `SCENE_TIMING`
- **Textes des mots slam** : `src/scenes/ProblemScene.tsx` → tableau `words`
- **Labels des beats UI** : `src/scenes/InActionScene.tsx` → composant `<Label />`
- **Tagline** : `src/scenes/RevealScene.tsx` et `src/scenes/ResultScene.tsx`

Pour **remplacer un mockup** par de vraies captures d'écran Zevo :
1. Dépose le PNG dans `public/screenshots/`
2. Dans `InActionScene.tsx`, remplace `<DashboardMock />` par :
   ```tsx
   import { Img, staticFile } from "remotion";
   <Img src={staticFile("screenshots/dashboard.png")} />
   ```

---

## ⚙️ Dépendances système

- **Node.js** ≥ 18 (tu as déjà `v24.14.0` via nvm)
- **Chromium** (téléchargé automatiquement par Remotion au 1er run)
- **FFmpeg** (bundlé avec Remotion, pas d'install manuelle)

---

## 🐛 Troubleshooting

- **"Cannot find module 'remotion'"** → `npm install` n'a pas tourné
- **Render lent** → baisser `Config.setConcurrency(4)` à `2` dans `remotion.config.ts` si CPU saturé
- **Polices manquantes** (Clash Display) → Remotion fallback automatiquement sur Inter. Pour utiliser Clash Display en rendu final, dépose les `.woff2` dans `public/fonts/` et ajoute un `@font-face` via `@remotion/fonts`.
