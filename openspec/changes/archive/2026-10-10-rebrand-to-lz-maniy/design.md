# Technical Design: Rebrand to lz-maniy

## Context

Aplikasi monorepo saat ini terdiri dari 3 paket internal (`@maniyy/shared`, `@maniyy/web`, `@maniyy/agent`) dan dijalankan di Cloudflare Pages (`maniyy2`) serta Cloudflare Workers (`maniyy-agent`). Domain produksi saat ini adalah `https://maniyy.membran.app`. Pada VPS `VM-3-103-ubuntu`, Cloudflare Tunnel (`cloudflared`) memiliki routing fallback `*.membran.app` yang mengarah ke port 8788 (Artifact Server). Karena `maniy.membran.app` belum didaftarkan sebagai Custom Domain di Cloudflare Pages, request ke domain tersebut jatuh ke port 8788.

Lihat `proposal.md` untuk ringkasan latar belakang dan kebutuhan rebrand.

## Goals / Non-Goals

**Goals:**
- Mendaftarkan `maniy.membran.app` secara langsung ke project Cloudflare Pages `maniyy2` via Cloudflare API.
- Memperbarui middleware CORS pada `apps/agent/src/index.ts` untuk mengizinkan `https://maniy.membran.app` dan subdomain Pages.
- Mengubah namespace monorepo dari `@maniyy/*` ke `@maniy/*` dan nama workspace root menjadi `lz-maniy-workspace`.
- Memperbarui path direktori kerja lokal VPS dari `/home/ubuntu/projects/lz-maniyy-v2` ke `/home/ubuntu/projects/lz-maniy` serta git remote origin.
- Memperbarui seluruh referensi visual, metadata HTML, brand i18n, judul halaman, dan file export chat ke `Maniy`.
- Menyediakan utilitas pembacaan `localStorage` dengan skema *read-fallback* (`maniy_*` -> `maniyy_*`) agar pengguna yang sudah memiliki preferensi filter tidak kehilangan state.
- Menyelaraskan teks prompt sistem Eve (`system-baseline.txt`, `system-compact.txt`, `system-fewshot.txt`) dan suite Arize Phoenix.

**Non-Goals:**
- Membuat ulang database backend PostgreSQL atau skema tabel Reedrich (skema D1/Postgres tetap utuh dan agnostik nama brand).
- Mengubah endpoint API inti Reedrich (`/api/v1/account-detail`, `/api/v1/transactions`).
- Menghentikan langsung domain `maniyy.membran.app` tanpa masa transisi grace period.

## Decisions

### 1. Edge Custom Domain Binding via Cloudflare API
- **Keputusan**: Gunakan Cloudflare API (`POST /accounts/{account_id}/pages/projects/maniyy2/domains`) dengan payload `{"name": "maniy.membran.app"}` menggunakan OAuth token / Wrangler token yang sudah terautentikasi di VPS.
- **Rasional**: Cloudflare Pages menangani provisioning sertifikat SSL edge dan routing otomatis dalam hitungan detik. Karena edge Cloudflare Pages memiliki prioritas lebih tinggi daripada DNS tunnel fallback, request ke `maniy.membran.app` langsung disajikan oleh Pages tanpa menyentuh VPS.
- **Alternatif yang ditolak**: Mengubah konfigurasi `/etc/cloudflared/config.yml` untuk me-reverse-proxy Pages dari VPS lokal (tidak efisien dan menambah latensi).

### 2. Backward-Compatible CORS Matrix
- **Keputusan**: Pada `apps/agent/src/index.ts`, tambahkan origin baru ke dalam whitelist validator:
  ```ts
  const allowed = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://maniy.membran.app',
    'https://maniyy.membran.app',
    'https://maniyy2.pages.dev',
    'https://maniy-agent.lutfidmz.workers.dev',
    'https://maniyy-agent.lutfidmz.workers.dev'
  ];
  if (allowed.includes(origin) || origin.endsWith('.pages.dev')) return origin;
  ```
- **Rasional**: Menjamin request dari pengguna yang masih membuka tab lama di `maniyy.membran.app` tidak mengalami network error saat berinteraksi dengan Eve Agent.

### 3. Transparent Storage Migration Pattern
- **Keputusan**: Buat helper fungsi penyimpanan terpadu untuk `localStorage` di `$lib/utils/storage`:
  ```ts
  export function getStoredValue<T>(newKey: string, legacyKey: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    const newVal = localStorage.getItem(newKey);
    if (newVal !== null) {
      try { return JSON.parse(newVal); } catch { return newVal as unknown as T; }
    }
    const legacyVal = localStorage.getItem(legacyKey);
    if (legacyVal !== null) {
      try {
        const parsed = JSON.parse(legacyVal);
        localStorage.setItem(newKey, legacyVal); // migrasikan salinan
        return parsed;
      } catch {
        localStorage.setItem(newKey, legacyVal);
        return legacyVal as unknown as T;
      }
    }
    return fallback;
  }
  ```
- **Rasional**: Mencegah resetting filter tanggal (`maniy_date_filter`), preferensi model (`maniy_selected_model`), lebar panel chat (`maniy_chat_panel_width`), dan pengaturan dashboard pengguna.

### 4. Monorepo Package Scopes & Folder Alignment
- **Keputusan**: Ganti semua instance `@maniyy/shared` menjadi `@maniy/shared`, `@maniyy/web` menjadi `@maniy/web`, dan `@maniyy/agent` menjadi `@maniy/agent` pada `package.json` masing-masing workspace, lalu jalankan `bun install` untuk memperbarui symlink lockfile.
- **Path Folder VPS**: Rename `/home/ubuntu/projects/lz-maniyy-v2` -> `/home/ubuntu/projects/lz-maniy`.
- **Git Remote**: Update remote URL ke `git@github.com:lutfi-zain/lz-maniy.git` atau `https://github.com/lutfi-zain/lz-maniy.git`.
- **Donna ACP**: Update baris meja koordinasi di `~/.omp/agent/AGENTS.md` dari `maniyy` (`/home/ubuntu/projects/lz-maniyy-v2`) menjadi `maniy` (`/home/ubuntu/projects/lz-maniy`).

## Risks / Trade-offs

| Risiko | Mitigasi |
| :--- | :--- |
| **Sesi Login OAuth Terputus**: Perubahan `client_id` dari `maniyy-web` ke `maniy-web` menolak refresh token lama pada backend ReedRich MCP. | Tampilkan indikator status login yang bersih, arahkan user ke tombol login Google/API key satu kali tanpa pesan error yang membingungkan. |
| **Downtime DNS selama Propagasi**: Klien mencoba mengakses domain sebelum sertifikat Cloudflare aktif. | Validasi status domain via Cloudflare API hingga `status: "active"` sebelum cutover total. |
| **Symlink Workspace Rusak setelah Folder Rename**: `node_modules` menyimpan absolute symlink ke path lama. | Jalankan `bun install --force` segera setelah rename direktori agar path symlink terkalibrasi ulang. |
| **Donna Agent Terputus**: Sub-agent ACP Donna Paulsen gagal menemukan folder lama. | Update bersamaan entri meja ACP di `~/.omp/agent/AGENTS.md` dan arsip OKF di `~/.donna/vault/.okf/projects/lz-maniy.md`. |

## Test & Verification Strategy

1. **Unit Tests**:
   - `bun run test:web` (34 test files, 225+ tests) harus 100% lulus setelah package rename `@maniy/shared`.
   - `bun run test:agent` (19 test files, 91+ tests) harus 100% lulus.
2. **Type Checking**:
   - `bun run check:web` (Svelte 5 runes check) harus 0 errors.
   - `bun run check:agent` / TypeScript build lulus.
3. **CORS Live Probing**:
   - Kirim `curl -I -X OPTIONS -H "Origin: https://maniy.membran.app" -H "Access-Control-Request-Method: POST" <agent_url>/api/conversations` dan pastikan header `Access-Control-Allow-Origin: https://maniy.membran.app` dikembalikan.
4. **Edge Domain Probing**:
   - Kirim `curl -sIL https://maniy.membran.app` dan pastikan status `HTTP/2 200` menyajikan HTML `<title>Maniy — Executive Financial Cockpit & Studios</title>`.
