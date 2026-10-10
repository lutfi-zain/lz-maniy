## Purpose

Menetapkan standar penamaan entitas, domain, CORS, storage migration fallback, dan repositori di bawah payung brand lz-maniy untuk menjamin konsistensi identitas, zero downtime, dan zero data loss.

## ADDED Requirements

### Requirement: Production Domain & Cloudflare Pages Edge Routing

The system MUST serve the production web application under `https://maniy.membran.app` via Cloudflare Pages project `maniyy2` with active edge SSL, while retaining the legacy domain `https://maniyy.membran.app` during the transition window before 301 redirection.

#### Scenario: Akses domain baru maniy.membran.app
- **WHEN** Pengguna membuka `https://maniy.membran.app` melalui web browser
- **THEN** Cloudflare Edge merespons dengan HTTP 200 menyajikan frontend aplikasi web Maniy dan tidak meneruskan request ke wildcard tunnel port 8788 (Artifact Server)

#### Scenario: Akses domain transisi maniyy.membran.app
- **WHEN** Pengguna membuka URL legacy `https://maniyy.membran.app`
- **THEN** Permintaan tetap dilayani dengan antarmuka frontend Maniy yang sama tanpa error DNS atau SSL

---

### Requirement: Agent Worker CORS Whitelisting

The agent backend worker MUST accept Cross-Origin Resource Sharing (CORS) preflight and data requests from `https://maniy.membran.app`, `https://maniy-agent.lutfidmz.workers.dev`, as well as legacy `https://maniyy.membran.app` and `*.pages.dev` origins.

#### Scenario: Preflight request dari domain maniy.membran.app
- **WHEN** Frontend mengirimkan permintaan `OPTIONS` atau `POST` ke endpoint backend agent dengan header `Origin: https://maniy.membran.app`
- **THEN** Backend mengembalikan header `Access-Control-Allow-Origin: https://maniy.membran.app` dan status HTTP 200/204

#### Scenario: Preflight request dari domain legacy maniyy.membran.app
- **WHEN** Klien lama mengirimkan permintaan ke backend agent dengan header `Origin: https://maniyy.membran.app`
- **THEN** Backend tetap mengizinkan request dengan mengembalikan header `Access-Control-Allow-Origin: https://maniyy.membran.app`

---

### Requirement: Frontend Brand Identity & Interface Copy

All user interface views, document HTML titles, i18n locale dictionaries, and chat export file names MUST consistently reflect the single-y `Maniy` brand identity.

#### Scenario: Judul halaman dan brand navigasi
- **WHEN** Pengguna memuat aplikasi web pada halaman Cockpit atau Login
- **THEN** Judul tab browser menampilkan `Maniy — Executive Financial Cockpit & Studios` atau `Masuk · Maniy Workspace`, dan elemen navigasi menampilkan brand `Maniy`

#### Scenario: Ekspor riwayat percakapan chat
- **WHEN** Pengguna menekan tombol unduh / ekspor percakapan pada panel AI Agent
- **THEN** Berkas JSON yang diunduh memiliki pola nama `maniy-chat-export-<timestamp>.json`

---

### Requirement: Transparent Browser Storage Migration with Zero Data Loss

The frontend client MUST implement a zero-data-loss read-fallback migration pattern for local storage: read new `maniy_*` key, fall back to legacy `maniyy_*` key if unpopulated, and write updates exclusively to the new `maniy_*` key.

#### Scenario: Pengguna lama dengan preferensi filter tanggal yang sudah tersimpan
- **WHEN** Pengguna yang sebelumnya memiliki preferensi tanggal pada key `maniyy_date_filter` membuka aplikasi web
- **THEN** Store membaca data dari `maniyy_date_filter`, mengaplikasikannya ke state aktif tanpa me-reset tanggal, dan menyimpan salinan ke `maniy_date_filter`

#### Scenario: Pengguna baru menyimpan konfigurasi model AI
- **WHEN** Pengguna memilih model AI baru pada panel chat
- **THEN** Pilihan model tersimpan secara eksklusif pada key `maniy_selected_model`

---

### Requirement: Monorepo Package Scopes & Repository Alignment

All internal monorepo packages MUST be scoped under `@maniy/*`, the root workspace MUST be named `lz-maniy-workspace`, and local project directory paths MUST align with `/home/ubuntu/projects/lz-maniy`.

#### Scenario: Resolusi dependensi monorepo
- **WHEN** Perintah `bun run check:web` atau `bun run test:web` dijalankan
- **THEN** Seluruh paket mengimpor kontrak tipe dari `@maniy/shared` tanpa referensi impor yang tertinggal ke `@maniyy/*` dan seluruh pengujian unit lulus
