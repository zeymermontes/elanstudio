# ÉLANSTUDIO — Auth email templates

On-brand Spanish email templates for Supabase Auth. Paste each into
**Supabase Dashboard → Authentication → Email Templates** under the matching
template, and set the suggested subject.

| File | Supabase template | Suggested subject |
|------|-------------------|-------------------|
| `confirm-signup.html` | Confirm signup | `Confirma tu correo · ÉLANSTUDIO` |
| `reset-password.html` | Reset Password | `Restablece tu contraseña · ÉLANSTUDIO` |
| `magic-link.html` | Magic Link | `Tu acceso a ÉLANSTUDIO` |
| `change-email.html` | Change Email Address | `Confirma tu nuevo correo · ÉLANSTUDIO` |

## Notes
- Leave the `{{ .ConfirmationURL }}` variables exactly as written — Supabase
  replaces them with the real link. `change-email.html` also uses `{{ .Email }}`
  (current) and `{{ .NewEmail }}` (new).
- Fonts are web-safe (Georgia / Helvetica) because email clients don't reliably
  load Google Fonts; brand colors (pink `#e29aaa`/`#d6849a`, gold `#c7a86a`,
  bone `#f8f4ef`) are exact.
- Set **Site URL** and **Redirect URLs** under Authentication → URL Configuration
  so links land on your live site, not `localhost`.
- For production deliverability, configure a custom **SMTP** provider in Supabase
  (the built-in mailer is rate-limited and for testing only).
