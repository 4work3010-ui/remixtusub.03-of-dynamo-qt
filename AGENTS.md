<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep representative QT records and derived calculations in one typed client-side mock dataset; this app is an immediately usable simulation without a connected data service.
- Keep the shared sidebar, header filters, and search in one root-level shell so every operational screen uses the same current view.
- Design tokens are the single source in src/styles.css (DYNAMO MES oklch palette, light default + .dark override); components use semantic classes only, never hardcoded colors.
- Root renders the app shell (sidebar+header) for all routes except /login; fonts are the system Segoe UI/Roboto stack, no remote font links.
- /login is the brand split-screen entry (DYNAMO VIETNAM MC, red Dynamo CTA, quick-role simulation buttons storing 'dynamo-user'); root / redirects there.
- /sync accepts CSV files and public Google Sheets share links (regex -> /export?format=csv, gviz fallback); parsing stays client-side and simulation-only.
- RBAC is client-side simulation only: /login verifies a ULID code against the AUTH_CONFIG sheet tab (vai_tro, ma_code, ghi_chu; 'qc' normalized to 'viewer'; qt_<vendor> = partner scoped to cty_QT in the shell); roles admin/leader/viewer/qt_* gate routes and prices in dynamo-auth.ts. Not real security — codes are visible in a public sheet.
- Mount <Toaster> as the first child of <body> in __root before children; toasts fired during shell-hydration effects are silently dropped when Toaster hydrates after the shell.
