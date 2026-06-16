# 📧 Templates email Supabase — Branded Zevo

> À coller dans **Supabase Studio → Authentication → Email Templates**.
> Tous les templates sont en HTML inline (pour compatibilité Gmail / Outlook / Apple Mail).

---

## 1️⃣ Confirm signup — "Confirmer ton compte"

**Subject :**
```
Confirme ton compte Zevo ✨
```

**Body (HTML) :**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Confirme ton compte Zevo</title>
</head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#F5F5F3;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D0D0D;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#1E1E1E;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">

          <!-- Liseré gradient orange en haut -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#FF6B2B 0%,#FF9A6C 100%);"></td>
          </tr>

          <!-- Logo + brand -->
          <tr>
            <td align="center" style="padding:40px 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#FF6B2B 0%,#FF9A6C 100%);width:48px;height:48px;border-radius:12px;text-align:center;vertical-align:middle;font-size:22px;font-weight:800;color:#FFFFFF;line-height:48px;letter-spacing:-1px;">
                    Z
                  </td>
                  <td style="padding-left:12px;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#F5F5F3;">
                    Zevo
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Titre -->
          <tr>
            <td align="center" style="padding:8px 32px 16px 32px;">
              <h1 style="margin:0;font-size:24px;font-weight:600;color:#F5F5F3;letter-spacing:-0.5px;">
                Bienvenue sur Zevo
              </h1>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:rgba(245,245,243,0.7);text-align:center;">
                Confirme ton adresse email pour activer ton compte coach et accéder à ton espace.
              </p>

              <!-- CTA principal -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#FF6B2B 0%,#FF9A6C 100%);color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;box-shadow:0 4px 16px rgba(255,107,43,0.3);">
                      Confirmer mon email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Lien secours -->
              <p style="margin:32px 0 0 0;font-size:13px;line-height:1.6;color:rgba(245,245,243,0.5);text-align:center;">
                Ou copie ce lien dans ton navigateur :
              </p>
              <p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;color:rgba(255,107,43,0.8);text-align:center;word-break:break-all;">
                <a href="{{ .ConfirmationURL }}" style="color:#FF6B2B;text-decoration:none;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>

          <!-- Separateur -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:rgba(255,255,255,0.08);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 32px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(245,245,243,0.4);text-align:center;">
                Tu n'es pas à l'origine de cette demande ? Tu peux ignorer cet email en toute sécurité.<br/>
                Le lien expirera dans 24 heures.
              </p>
            </td>
          </tr>

        </table>

        <!-- Brand footer hors card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;margin-top:24px;">
          <tr>
            <td align="center">
              <p style="margin:0;font-size:12px;color:rgba(245,245,243,0.3);">
                © {{ now.Year }} Zevo · La plateforme des coachs sportifs
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2️⃣ Reset password — "Réinitialiser ton mot de passe"

**Subject :**
```
Réinitialise ton mot de passe Zevo
```

**Body :** identique au template ci-dessus, en remplaçant :
- Titre : `Bienvenue sur Zevo` → `Mot de passe oublié ?`
- Texte : `Confirme ton adresse email...` → `Clique sur le bouton ci-dessous pour définir un nouveau mot de passe.`
- CTA label : `Confirmer mon email` → `Réinitialiser mon mot de passe`
- Footer : `Tu n'es pas à l'origine...` → `Tu n'as pas demandé de réinitialisation ? Ignore cet email, ton mot de passe restera inchangé.`

---

## 3️⃣ Magic link (login sans mot de passe)

**Subject :**
```
Ton lien de connexion Zevo
```

**Body :** template identique avec :
- Titre : `Connexion à ton espace`
- Texte : `Clique sur le bouton ci-dessous pour te connecter à ton compte coach.`
- CTA : `Me connecter`

---

## 4️⃣ Email change — "Confirmer ton nouvel email"

**Subject :**
```
Confirme ta nouvelle adresse email
```

**Body :** template identique avec :
- Titre : `Confirme ta nouvelle adresse`
- Texte : `Tu as demandé à changer l'email associé à ton compte. Confirme cette nouvelle adresse pour finaliser le changement.`
- CTA : `Confirmer le changement`

---

## 🛠 Comment installer

1. **Supabase Studio** → **Authentication** → **Email Templates**
2. Sélectionne le template à modifier (Confirm signup, Reset password, etc.)
3. Onglet **Subject** : colle le sujet
4. Onglet **Message** : passe en mode **HTML** (bouton `<>` en haut) → colle le HTML
5. **Save**

Variables disponibles dans tous les templates :
- `{{ .ConfirmationURL }}` — lien d'action principal
- `{{ .Email }}` — email du destinataire
- `{{ .Token }}` — code OTP (si activé)
- `{{ .SiteURL }}` — URL du site (configurée dans URL Configuration)

---

## ⚡ Bonus — Désactiver le rate limit Supabase (4 emails/heure)

Sur le free tier, Supabase limite à **4 emails de confirmation par heure**. Pour le launch et au-delà, branche **Resend** comme SMTP custom :

### Setup Resend SMTP dans Supabase

1. Resend Dashboard → **API Keys** → crée une key avec scope "Sending"
2. Resend Dashboard → **Domains** → ajoute `zevo-one.com` (ou ton sous-domaine `mail.zevo-one.com`) → vérifie SPF/DKIM/DMARC
3. Supabase Studio → **Authentication** → **Sign In / Providers** → **Email** → scroll jusqu'à **SMTP Settings** → active **Enable Custom SMTP**
4. Remplis :
   - Host : `smtp.resend.com`
   - Port : `465` (SSL) ou `587` (TLS)
   - Username : `resend`
   - Password : ta clé API Resend (commence par `re_`)
   - Sender email : `noreply@zevo-one.com` (ou ton domaine vérifié)
   - Sender name : `Zevo`
5. Save → Supabase enverra désormais via Resend
6. **Tu n'as plus de rate limit Supabase** — tu es soumis à celui de Resend (3000 emails/mois en free, 50k en Pro 20$/mois)

### Bénéfices
- ✅ Plus de "email rate limit exceeded" pendant tes tests
- ✅ Meilleure deliverability (passe pas en spam)
- ✅ Logs centralisés dans Resend
- ✅ Email branded (`@zevo-one.com` pas `@supabase.co`)
