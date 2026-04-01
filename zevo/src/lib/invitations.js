// ═══════════════════════════════════════════════════════════════════════════
// Invitations — Utility partagée
// Centralise la logique d'invitation (DB + envoi email)
// Utilisé par : CoachClientsPage, CoachClientHub, CoachTutorial
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from './supabase'

/**
 * Crée une invitation en base + envoie l'email via Edge Function
 *
 * @param {Object} params
 * @param {string} params.coachId     — UUID du coach connecté
 * @param {string} params.email       — Email du client à inviter
 * @param {string} params.prenom      — Prénom du client (pour l'email)
 * @param {string} [params.coachName] — Nom affiché du coach (pour l'email)
 *
 * @returns {{ success: boolean, data?: Object, lien?: string, error?: string }}
 */
export async function sendInvitation({ coachId, email, prenom, coachName }) {
  // ── 1. Insert en base (génère le token automatiquement) ──
  const { data, error } = await supabase
    .from('invitations')
    .insert({ coach_id: coachId, email: email.trim() })
    .select()
    .single()

  if (error) {
    const msg = error.message?.includes('duplicate')
      ? 'Une invitation a déjà été envoyée à cet email.'
      : 'Erreur lors de la création de l\'invitation.'
    return { success: false, error: msg }
  }

  const lien = `${window.location.origin}/invite/${data.token}`

  // ── 2. Envoyer l'email via Edge Function (non-bloquant) ──
  // Si l'envoi email échoue, l'invitation existe quand même en base
  // Le coach pourra toujours copier le lien manuellement
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.access_token) {
      const res = await supabase.functions.invoke('send-invitation', {
        body: {
          email: email.trim(),
          prenom: prenom?.trim() || '',
          inviteLink: lien,
          coachName: coachName || '',
        },
      })

      if (res.error) {
        console.warn('[invitations] Email non envoyé:', res.error)
        // On ne bloque pas — l'invitation est créée, le lien est dispo
        return {
          success: true,
          data,
          lien,
          emailSent: false,
          emailError: 'L\'invitation a été créée mais l\'email n\'a pas pu être envoyé. Partage le lien manuellement.',
        }
      }

      return { success: true, data, lien, emailSent: true }
    }
  } catch (err) {
    console.warn('[invitations] Edge function error:', err)
  }

  // Fallback : invitation créée, email pas envoyé
  return { success: true, data, lien, emailSent: false }
}
