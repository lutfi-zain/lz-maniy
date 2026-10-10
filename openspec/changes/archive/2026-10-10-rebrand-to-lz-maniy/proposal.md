# Proposal: Rebrand to lz-maniy

## Why

Aplikasi dashboard personal finance dan agent intelligence sebelumnya menggunakan penamaan legacy `maniyy` (dengan 2 huruf 'y') dan domain `maniyy.membran.app`. Untuk menyelaraskan identitas brand resmi yang ringkas dan konsisten, diputuskan rebrand total menjadi **Maniy** (dengan 1 huruf 'y') dengan domain produksi `https://maniy.membran.app`, folder dan repository `lz-maniy`, package scope `@maniy/*`, serta pembaruan CORS backend edge. Transisi ini harus menjamin zero downtime, zero data loss pada browser storage pengguna, dan kompatibilitas transisi lintas domain.

## What Changes

- **Edge Domain Routing**: Menambahkan custom domain `maniy.membran.app` pada Cloudflare Pages project `maniyy2` dengan SSL otomatis, memotong wildcard tunnel VPS (`*.membran.app:8788`), serta mempertahankan `maniyy.membran.app` selama masa transisi sebelum dipasang 301 redirect.
- **Backend CORS Whitelist**: Memperbarui middleware CORS pada Cloudflare Worker Agent (`apps/agent/src/index.ts`) agar mengizinkan origin `https://maniy.membran.app`, `https://maniy-agent.lutfidmz.workers.dev`, sembari tetap mempertahankan origin legacy `https://maniyy.membran.app` dan pattern `*.pages.dev`.
- **Monorepo Package Scopes**:
  - Mengubah `@maniyy/shared` menjadi `@maniy/shared`.
  - Mengubah `@maniyy/web` menjadi `@maniy/web`.
  - Mengubah `@maniyy/agent` menjadi `@maniy/agent`.
  - Mengubah root workspace name dari `lz-maniyy-v2-workspace` menjadi `lz-maniy-workspace`.
- **Folder & Repository Path**:
  - Mengubah direktori proyek VPS dari `/home/ubuntu/projects/lz-maniyy-v2` menjadi `/home/ubuntu/projects/lz-maniy`.
  - Mengarahkan git remote URL ke `https://github.com/lutfi-zain/lz-maniy.git`.
  - Mengubah integrasi ACP global pada `/home/ubuntu/.omp/agent/AGENTS.md` (meja `maniy`) dan konsep vault `.okf` terkait.
- **Frontend UI & Branding**:
  - Memperbarui title dokumen menjadi `Maniy — Executive Financial Cockpit & Studios`.
  - Memperbarui nama brand di navigasi i18n (`en.ts` dan `id.ts`) menjadi `Maniy`.
  - Memperbarui copy UI, header, dan footer di layout utama serta halaman login (`Maniy Workspace`).
  - Mengubah prefix nama file export chat menjadi `maniy-chat-export-${Date.now()}.json`.
  - Mengubah OAuth PKCE `client_id` menjadi `maniy-web`.
- **Browser Storage Persistence (Zero Data Loss Migration)**:
  - Mengimplementasikan helper migrasi transparan untuk `maniyy_locale` -> `maniy_locale`, `maniyy_chat_panel_width` -> `maniy_chat_panel_width`, `maniyy_selected_model` -> `maniy_selected_model`, `maniyy_date_filter` -> `maniy_date_filter`, dan `maniyy_user_settings` -> `maniy_user_settings`. Helper membaca key baru, fallback ke key lama jika key baru belum ada, dan menulis ke key baru.
- **Agent System Prompt & Arize Phoenix Evals**:
  - Menyelaraskan teks prompt sistem Eve (`system-baseline.txt`, `system-compact.txt`, `system-fewshot.txt`) menjadi 'asisten finansial Maniy'.
  - Menyelaraskan penamaan repositori prompt, evaluator, dan dataset di Arize Phoenix (`maniy-agent-system`, `maniy-agent-evals`, `maniy-financial-golden-dataset`).

## Capabilities

### New Capabilities
- `rebrand`: Standar penamaan entitas, domain, CORS, storage migration fallback, dan repositori di bawah payung brand `lz-maniy`.

### Modified Capabilities
- `account-dashboard`: Memperbarui judul halaman, footer, navigasi brand i18n, dan storage key tanggal filter.
- `agent-chat/frontend`: Memperbarui storage key panel width, model selector, dan format nama file download export chat.
- `agent-chat/backend`: Memperbarui whitelist CORS dan system prompt persona agent.

## Impact

- **Breaking Changes**:
  - Pergantian OAuth `client_id` dari `maniyy-web` ke `maniy-web` akan membatalkan refresh token yang tersimpan di sesi browser lama, sehingga user diminta untuk login ulang satu kali.
  - Perubahan path folder lokal VPS memerlukan pembaruan referensi ACP di `~/.omp/agent/AGENTS.md` agar Donna tetap dapat berkoordinasi via stdio JSON-RPC.
- **Non-Breaking**:
  - Storage migration transparan menjaga preferensi pengguna (filter tanggal, preset, lebar panel chat) tetap utuh.
  - CORS ganda memastikan request dari domain lama maupun baru tetap diterima backend tanpa error HTTP 403/CORS.
