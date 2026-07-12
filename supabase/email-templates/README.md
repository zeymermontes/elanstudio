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
- **You must paste each of these into the dashboard.** If a template is left at
  its Supabase default, its link points at `/auth/v1/verify?...&redirect_to=<Site
  URL>`, which drops the user on the home screen with the token in the URL hash
  instead of routing through our `/auth/confirm` handler. (Symptom: clicking the
  reset link just opens the home page.) These templates instead link to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`, which
  establishes a real server session and lands the user on the right page
  (`reset-password.html` → `/restablecer`).
- `change-email.html` also uses `{{ .Email }}` (current) and `{{ .NewEmail }}`
  (new); keep the `{{ .TokenHash }}` / `{{ .SiteURL }}` variables as written.
- Fonts are web-safe (Georgia / Helvetica) because email clients don't reliably
  load Google Fonts; brand colors (pink `#e29aaa`/`#d6849a`, gold `#c7a86a`,
  bone `#f8f4ef`) are exact.
- Set **Site URL** and **Redirect URLs** under Authentication → URL Configuration
  so links land on your live site, not `localhost`.
- For production deliverability, configure a custom **SMTP** provider in Supabase
  (the built-in mailer is rate-limited and for testing only).
