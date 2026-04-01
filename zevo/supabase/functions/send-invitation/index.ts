// ═══════════════════════════════════════════════════════════════════════════
// Edge Function : send-invitation
// Envoie un email d'invitation branded via Resend
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // ── CORS preflight ──
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth : vérifier le JWT ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Session invalide' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Body ──
    const { email, prenom, inviteLink, coachName } = await req.json()

    if (!email || !inviteLink) {
      return new Response(JSON.stringify({ error: 'email et inviteLink requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Simplification : on utilise le nom envoyé par l'application ──
    const displayCoachName = coachName || 'Ton coach Zevo'
    const clientPrenom = prenom || ''

    // ── Envoi email via Resend ──
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Zevo <onboarding@resend.dev>',
        to: [email],
        subject: `${displayCoachName} t'invite sur Zevo`,
        html: buildEmailHtml({ clientPrenom, displayCoachName, inviteLink, email }),
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Resend error:', errBody)
      return new Response(JSON.stringify({ error: 'Erreur envoi email', details: errBody }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resData = await res.json()

    return new Response(JSON.stringify({ success: true, emailId: resData.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATE — HTML branded Zevo
// ═══════════════════════════════════════════════════════════════════════════

function buildEmailHtml({
  clientPrenom,
  displayCoachName,
  inviteLink,
  email,
}: {
  clientPrenom: string
  displayCoachName: string
  inviteLink: string
  email: string
}) {
  const greeting = clientPrenom ? `Salut ${clientPrenom},` : 'Bonjour,'

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitation Zevo</title>
</head>
<body style="margin:0;padding:0;background-color:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D0D;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:800;color:#FF6B2B;letter-spacing:-0.5px;">Zevo</span>
            </td>
          </tr>
          <tr>
            <td style="background:#1E1E1E;border-radius:20px;border:1px solid rgba(255,255,255,0.08);padding:40px 32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#F5F5F3;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(245,245,243,0.55);">
                <strong style="color:#F5F5F3;">${displayCoachName}</strong> t'invite à rejoindre son espace de coaching sur Zevo. Crée ton compte en un clic pour accéder à tes programmes, ton suivi et bien plus.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${inviteLink}"
                       target="_blank"
                       style="display:inline-block;padding:14px 36px;background:#FF6B2B;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px;box-shadow:0 4px 20px rgba(255,107,43,0.3);">
                      Rejoindre l'espace
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 20px;" />
              <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:rgba(245,245,243,0.3);text-transform:uppercase;letter-spacing:1px;">
                Ce qui t'attend
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${[
                  { emoji: '🏋️', label: 'Programmes sport personnalisés' },
                  { emoji: '🥗', label: 'Plans nutrition sur mesure' },
                  { emoji: '📊', label: 'Suivi de ta progression en temps réel' },
                  { emoji: '💬', label: 'Messagerie directe avec ton coach' },
                ].map(item => `
                <tr>
                  <td style="padding:6px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:28px;font-size:14px;vertical-align:middle;">${item.emoji}</td>
                        <td style="font-size:14px;color:rgba(245,245,243,0.5);vertical-align:middle;">${item.label}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `).join('')}
              </table>
              <p style="margin:28px 0 0;font-size:11px;color:rgba(245,245,243,0.2);word-break:break-all;">
                Si le bouton ne fonctionne pas, copie ce lien :<br/>
                <a href="${inviteLink}" style="color:#FF6B2B;text-decoration:none;">${inviteLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;font-size:11px;color:rgba(245,245,243,0.15);">
                Tu reçois cet email car ${email} a été invité sur Zevo par ${displayCoachName}.<br/>
                Si ce n'est pas toi, ignore simplement ce message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}