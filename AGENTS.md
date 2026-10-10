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
- ULID login is verified server-side (createServerFn in src/lib/auth.functions.ts) so the AUTH_CONFIG URL and code list never reach the browser; route/price/vendor gating after login stays client-side (role in localStorage).
- Mount <Toaster> as the first child of <body> in __root before children; toasts fired during shell-hydration effects are silently dropped when Toaster hydrates after the shell.
- Vendor write-back: updateLotProgress server fn re-verifies the ULID (stored as dynamo-code) and whitelists fields before posting to the Apps Script webhook; whitelist lives in auth.functions.ts so admins can open more columns in one place.
- Lot status transitions, update validation and the per-device audit log live in src/lib/dynamo-workflow.ts; every screen that changes a lot must go through LotUpdateButton so rules stay consistent.
- Overdue/due-soon/missing-due/on-time and the logistics vs QC split live in src/lib/dynamo-rules.ts; Dashboard and Tracking must both use it so a lot is classified the same on every screen.
