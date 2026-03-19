/**
 * Calcul du score bien-être quotidien (0-100)
 *
 * Pondération :
 *   - Habitudes cochées ce jour : 30%
 *   - Qualité du sommeil (1-5 → 0-100) : 25%
 *   - Humeur (1-10 → 0-100) : 25%
 *   - Activité physique (présence + intensité) : 20%
 */
export function calculerScoreBienEtre({ habitudes, sommeil, humeur, sport }) {
  // Composante habitudes — ratio tâches cochées / tâches totales
  let scoreHabitudes = 0
  if (habitudes && habitudes.total > 0) {
    scoreHabitudes = (habitudes.cochees / habitudes.total) * 100
  }

  // Composante sommeil — qualité 1-5 ramenée à 0-100
  let scoreSommeil = 0
  if (sommeil?.qualite) {
    scoreSommeil = ((sommeil.qualite - 1) / 4) * 100
  }

  // Composante humeur — score 1-10 ramené à 0-100
  let scoreHumeur = 0
  if (humeur?.score) {
    scoreHumeur = ((humeur.score - 1) / 9) * 100
  }

  // Composante sport — bonus selon intensité (0 si pas de séance)
  let scoreSport = 0
  if (sport?.intensite) {
    scoreSport = ((sport.intensite - 1) / 4) * 100
  }

  // Score pondéré arrondi
  const score = Math.round(
    scoreHabitudes * 0.30 +
    scoreSommeil * 0.25 +
    scoreHumeur * 0.25 +
    scoreSport * 0.20
  )

  return Math.min(100, Math.max(0, score))
}

// Couleur du score selon la valeur
export function couleurScore(score) {
  if (score >= 75) return '#22c55e' // vert
  if (score >= 50) return '#FF6B2B' // orange
  if (score >= 25) return '#f59e0b' // jaune
  return '#ef4444' // rouge
}

// Label textuel du score
export function labelScore(score) {
  if (score >= 75) return 'Excellent'
  if (score >= 50) return 'Bon'
  if (score >= 25) return 'Moyen'
  return 'Faible'
}
