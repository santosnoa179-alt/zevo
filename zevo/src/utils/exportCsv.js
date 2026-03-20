/**
 * Utilitaire d'export CSV
 * Génère et télécharge un fichier CSV depuis des données
 */

/**
 * Convertit un tableau d'objets en contenu CSV
 * @param {Array} data - Tableau d'objets
 * @param {Array} columns - [{ key: 'nom', label: 'Nom' }]
 * @returns {string} Contenu CSV
 */
export function objectsToCsv(data, columns) {
  const header = columns.map(c => `"${c.label}"`).join(';')
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? ''
      // Échapper les guillemets doubles
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(';')
  )
  return [header, ...rows].join('\n')
}

/**
 * Déclenche le téléchargement d'un fichier CSV
 * @param {string} csvContent - Contenu CSV
 * @param {string} filename - Nom du fichier (sans extension)
 */
export function downloadCsv(csvContent, filename) {
  // BOM UTF-8 pour Excel
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export des habitudes d'un client sur une période
 * @param {object} supabase - Client Supabase
 * @param {string} clientId - ID du client
 * @param {string} clientNom - Nom du client
 * @param {string} dateDebut - Date début YYYY-MM-DD
 * @param {string} dateFin - Date fin YYYY-MM-DD
 */
export async function exportHabitudes(supabase, clientId, clientNom, dateDebut, dateFin) {
  // Charger les habitudes
  const { data: habitudes } = await supabase
    .from('habitudes')
    .select('id, nom')
    .eq('client_id', clientId)

  // Charger les logs sur la période
  const { data: logs } = await supabase
    .from('habitudes_log')
    .select('habitude_id, date, complete')
    .eq('client_id', clientId)
    .gte('date', dateDebut)
    .lte('date', dateFin)

  const habsMap = {}
  ;(habitudes || []).forEach(h => { habsMap[h.id] = h.nom })

  const rows = (logs || []).map(l => ({
    date: l.date,
    habitude: habsMap[l.habitude_id] || 'Inconnue',
    complete: l.complete ? 'Oui' : 'Non',
  }))

  // Trier par date
  rows.sort((a, b) => a.date.localeCompare(b.date))

  const csv = objectsToCsv(rows, [
    { key: 'date', label: 'Date' },
    { key: 'habitude', label: 'Habitude' },
    { key: 'complete', label: 'Complétée' },
  ])

  const slug = (clientNom || 'client').replace(/\s+/g, '_')
  downloadCsv(csv, `habitudes_${slug}_${dateDebut}_${dateFin}`)
}

/**
 * Export des objectifs d'un client
 * @param {object} supabase - Client Supabase
 * @param {string} clientId - ID du client
 * @param {string} clientNom - Nom du client
 */
export async function exportObjectifs(supabase, clientId, clientNom) {
  const { data } = await supabase
    .from('objectifs')
    .select('titre, description, score, date_cible, archive, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  const rows = (data || []).map(o => ({
    titre: o.titre,
    description: o.description || '',
    score: `${o.score}%`,
    date_cible: o.date_cible || '',
    statut: o.archive ? 'Archivé' : o.score === 100 ? 'Atteint' : 'En cours',
    cree_le: new Date(o.created_at).toLocaleDateString('fr-FR'),
  }))

  const csv = objectsToCsv(rows, [
    { key: 'titre', label: 'Objectif' },
    { key: 'description', label: 'Description' },
    { key: 'score', label: 'Score' },
    { key: 'statut', label: 'Statut' },
    { key: 'date_cible', label: 'Date cible' },
    { key: 'cree_le', label: 'Créé le' },
  ])

  const slug = (clientNom || 'client').replace(/\s+/g, '_')
  downloadCsv(csv, `objectifs_${slug}`)
}
