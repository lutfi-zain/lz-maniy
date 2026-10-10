## 1. Edge Domain Routing & Backend CORS Whitelist

- [x] 1.1 Daftarkan custom domain `maniy.membran.app` ke Cloudflare Pages project `maniyy2` melalui Cloudflare API dan verifikasi status aktif domain.
- [x] 1.2 Perbarui middleware CORS di `apps/agent/src/index.ts` untuk mengizinkan origin `https://maniy.membran.app`, `https://maniy-agent.lutfidmz.workers.dev`, serta mempertahankan `https://maniyy.membran.app` dan pattern `*.pages.dev`.
- [x] 1.3 Jalankan pengujian unit CORS dan router di `apps/agent` dengan `bun test src/__tests__/unit/cors.test.ts` (atau test suite agent terkait) untuk memvalidasi preflight headers.

## 2. Monorepo Package Scopes & Internal References
- [x] 2.1 Ubah namespace paket pada `packages/shared/package.json` menjadi `@maniy/shared`.
- [x] 2.2 Ubah nama paket pada `apps/web/package.json` menjadi `@maniy/web` dan perbarui dependensi workspace `@maniyy/shared` menjadi `@maniy/shared`.
- [x] 2.3 Ubah nama paket pada `apps/agent/package.json` menjadi `@maniy/agent` dan perbarui dependensi workspace `@maniyy/shared` menjadi `@maniy/shared`.
- [x] 2.4 Ganti seluruh import string `@maniyy/shared` menjadi `@maniy/shared` di seluruh file TypeScript / Svelte pada `apps/web` dan `apps/agent`.
- [x] 2.5 Ubah root `package.json` name menjadi `lz-maniy-workspace` dan jalankan `bun install` untuk meregenerasi symlink `node_modules`.

## 3. Frontend Branding, Meta, i18n & Storage Migration

- [x] 3.1 Buat storage migration helper di `apps/web/src/lib/utils/storage.ts` yang membaca key `maniy_*` dengan fallback transparan ke `maniyy_*`.
- [x] 3.2 Terapkan storage helper pada `date-filter.svelte.ts` (`maniy_date_filter`), `settings.svelte.ts` (`maniy_user_settings`), `chat.svelte.ts` (`maniy_chat_panel_width`, `maniy_selected_model`), dan `i18n/index.svelte.ts` (`maniy_locale`).
- [x] 3.3 Perbarui judul halaman di `apps/web/src/app.html`, `apps/web/src/routes/+layout.svelte`, `login/+page.svelte`, dan `auth/callback/+page.svelte` menjadi `Maniy`.
- [x] 3.4 Perbarui nama brand pada kamus i18n `apps/web/src/lib/i18n/locales/en.ts` dan `id.ts` menjadi `'Maniy'`.
- [x] 3.5 Perbarui OAuth PKCE `client_id` menjadi `maniy-web` dan format nama unduhan chat export menjadi `maniy-chat-export-${Date.now()}.json`.
- [x] 3.6 Jalankan `bun run check:web` dan `bun run test:web` untuk memastikan 34 test files lulus 100%.

## 4. Agent Prompts & Arize Phoenix Evals Suite

- [x] 4.1 Perbarui persona sistem prompt Eve pada `apps/agent/prompts/system-baseline.txt`, `system-compact.txt`, dan `system-fewshot.txt` agar menggunakan penamaan brand Maniy.
- [x] 4.2 Selaraskan nama repositori prompt, evaluator, dan dataset pada `apps/agent/eval/phoenix-suite.ts` (`maniy-agent-system`, `maniy-agent-evals`, `maniy-financial-golden-dataset`) dan `provider.ts` (`ManiyAgentProvider`).
- [x] 4.3 Perbarui unit test agent di `apps/agent/src/__tests__/unit/phoenix-suite.test.ts` dan `http-tracing.test.ts` agar memvalidasi string penamaan baru.
- [x] 4.4 Jalankan `bun run test:agent` untuk memverifikasi 19 test files agent lulus 100%.

## 5. Repository Path, Git Remote & Donna ACP Integration

- [x] 5.1 Rename direktori kerja lokal VPS dari `/home/ubuntu/projects/lz-maniyy-v2` menjadi `/home/ubuntu/projects/lz-maniy`.
- [x] 5.2 Perbarui remote git origin menggunakan `git remote set-url origin https://github.com/lutfi-zain/lz-maniy.git`.
- [x] 5.3 Perbarui baris integrasi meja ACP pada `/home/ubuntu/.omp/agent/AGENTS.md` menjadi `maniy (/home/ubuntu/projects/lz-maniy): Frontend Svelte 5 Maniy`.
- [x] 5.4 Perbarui dokumen konsep vault Donna di `~/.donna/vault/.okf/projects/` dari `lz-maniyy-v2.md` menjadi `lz-maniy.md` beserta tautan referensinya.

## 6. End-to-End Verification & Secret Checks
- [x] 6.1 Jalankan `bun scripts/check-secrets.ts` untuk memastikan tidak ada token atau kredensial yang bocor sebelum staging.
- [x] 6.2 Lakukan build produksi web dengan `bun run build:web` dan uji preview lokal.
- [x] 6.3 Lakukan live curl probe ke `https://maniy.membran.app` dan pastikan halaman web menyajikan HTML dengan judul `Maniy — Executive Financial Cockpit & Studios` (HTTP 200).
- [x] 6.4 Lakukan live CORS probe ke endpoint backend agent untuk memastikan header `Access-Control-Allow-Origin: https://maniy.membran.app` dikembalikan.
