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
        from: 'Zevo <invites@zevo-one.com>',
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
  // Initiale du coach pour l'avatar (fallback 'Z' si vide)
  const coachInitial = (displayCoachName || 'Z').trim().charAt(0).toUpperCase()
  // Échappe les caractères HTML dans les valeurs dynamiques
  const esc = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  const safeCoachName = esc(displayCoachName)
  const safeGreeting = esc(greeting)
  const safeEmail = esc(email)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
  <title>Invitation Zevo</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    body, table, td { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { text-decoration:none; }
    /* Dark mode safeguards */
    [data-ogsc] .bg-base { background-color:#0D0D0D !important; }
    [data-ogsc] .bg-card { background-color:#141414 !important; }
    [data-ogsc] .bg-surface { background-color:#1E1E1E !important; }
    [data-ogsc] .text-primary { color:#F5F5F3 !important; }
    [data-ogsc] .text-muted { color:rgba(245,245,243,0.55) !important; }
    [data-ogsc] .text-soft { color:rgba(245,245,243,0.35) !important; }
    [data-ogsc] .text-brand { color:#FF6B2B !important; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; padding:20px 12px !important; }
      .card { padding:32px 22px !important; border-radius:18px !important; }
      .hero-title { font-size:22px !important; line-height:1.25 !important; }
      .cta-btn { font-size:15px !important; padding:14px 28px !important; }
    }
  </style>
</head>
<body class="bg-base" style="margin:0;padding:0;background-color:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F5F5F3;">
  <!-- Preheader (prévisualisation inbox, caché dans le corps) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#0D0D0D;">
    ${safeCoachName} t'invite sur Zevo — crée ton compte en un clic.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-base" style="background-color:#0D0D0D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width:560px;width:100%;">

          <!-- ─── HEADER : logo Zevo ─── -->
          <tr>
            <td align="center" style="padding:0 0 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="https://zevo-one.com/icon-192.png" width="36" height="36" alt="Zevo" style="display:block;border-radius:9px;" />
                  </td>
                  <td class="text-primary" style="vertical-align:middle;font-size:24px;font-weight:800;color:#F5F5F3;letter-spacing:-0.4px;">
                    ZEVO
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── CARD PRINCIPALE ─── -->
          <tr>
            <td class="card bg-card" style="background-color:#141414;border:1px solid rgba(255,255,255,0.06);border-radius:24px;padding:44px 40px;box-shadow:0 8px 40px rgba(0,0,0,0.4);">

              <!-- Avatar coach -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td style="width:56px;height:56px;border-radius:28px;background:linear-gradient(135deg,#FF6B2B 0%,#FF9A6C 100%);color:#ffffff;font-size:22px;font-weight:800;text-align:center;vertical-align:middle;line-height:56px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    ${esc(coachInitial)}
                  </td>
                  <td style="padding-left:14px;vertical-align:middle;">
                    <div class="text-soft" style="font-size:12px;font-weight:600;color:rgba(245,245,243,0.35);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:2px;">Ton coach</div>
                    <div class="text-primary" style="font-size:15px;font-weight:700;color:#F5F5F3;">${safeCoachName}</div>
                  </td>
                </tr>
              </table>

              <!-- Titre principal -->
              <p class="hero-title text-primary" style="margin:0 0 10px;font-size:26px;font-weight:800;line-height:1.25;color:#F5F5F3;letter-spacing:-0.5px;">
                ${safeGreeting}<br/>
                <span class="text-brand" style="color:#FF6B2B;">Tu es invité sur Zevo.</span>
              </p>

              <!-- Description -->
              <p class="text-muted" style="margin:0 0 32px;font-size:15px;line-height:1.65;color:rgba(245,245,243,0.55);">
                <strong class="text-primary" style="color:#F5F5F3;font-weight:600;">${safeCoachName}</strong> a créé un espace personnalisé pour t'accompagner. Rejoins-le en un clic pour accéder à tes programmes, ton suivi et ta progression.
              </p>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 32px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${inviteLink}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="27%" stroke="f" fillcolor="#FF6B2B">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;">Rejoindre mon espace  →</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a class="cta-btn" href="${inviteLink}" target="_blank"
                       style="display:inline-block;padding:16px 40px;background:#FF6B2B;background:linear-gradient(135deg,#FF6B2B 0%,#FF7A42 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px;letter-spacing:0.2px;box-shadow:0 8px 24px rgba(255,107,43,0.35);mso-padding-alt:0;">
                      Rejoindre mon espace &nbsp;→
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height:1px;background-color:rgba(255,255,255,0.06);margin:0 0 24px;line-height:1px;font-size:1px;">&nbsp;</div>

              <!-- Features -->
              <p class="text-soft" style="margin:0 0 14px;font-size:11px;font-weight:700;color:rgba(245,245,243,0.35);text-transform:uppercase;letter-spacing:1.5px;">
                Ce qui t'attend
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${[
                  { emoji: '🏋️', label: 'Programmes sport personnalisés' },
                  { emoji: '🥗', label: 'Plans nutrition sur mesure' },
                  { emoji: '📊', label: 'Suivi de ta progression en temps réel' },
                  { emoji: '💬', label: 'Messagerie directe avec ton coach' },
                ].map(item => `
                <tr>
                  <td style="padding:8px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="bg-surface" style="width:34px;height:34px;background-color:#1E1E1E;border-radius:10px;text-align:center;vertical-align:middle;font-size:15px;line-height:34px;">${item.emoji}</td>
                        <td class="text-muted" style="padding-left:12px;font-size:14px;color:rgba(245,245,243,0.65);vertical-align:middle;">${item.label}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `).join('')}
              </table>

              <!-- Fallback link -->
              <div style="margin-top:32px;padding:14px 16px;background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:12px;">
                <p class="text-soft" style="margin:0 0 6px;font-size:11px;color:rgba(245,245,243,0.4);font-weight:600;">
                  Le bouton ne fonctionne pas&nbsp;?
                </p>
                <a href="${inviteLink}" class="text-brand" style="font-size:11px;color:#FF6B2B;word-break:break-all;text-decoration:none;">${inviteLink}</a>
              </div>

            </td>
          </tr>

          <!-- ─── FOOTER ─── -->
          <tr>
            <td align="center" style="padding:32px 16px 0;">
              <p class="text-soft" style="margin:0 0 6px;font-size:12px;color:rgba(245,245,243,0.3);font-weight:600;">
                Zevo — La plateforme des coachs sportifs
              </p>
              <p class="text-soft" style="margin:0;font-size:11px;line-height:1.6;color:rgba(245,245,243,0.2);">
                Tu reçois cet email car ${safeEmail} a été invité par ${safeCoachName}.<br/>
                Si ce n'est pas toi, ignore simplement ce message.
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:rgba(245,245,243,0.15);">
                <a href="https://zevo-one.com" class="text-soft" style="color:rgba(245,245,243,0.3);text-decoration:none;">zevo-one.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}