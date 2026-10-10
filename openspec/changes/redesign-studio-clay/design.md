## Context

Landing page Membran Studio (`apps/studio`) adalah proyek SvelteKit mandiri berbasis `@sveltejs/adapter-static` yang menghasilkan berkas HTML statis murni untuk Cloudflare Pages (`membran-app`, domain `membran.app`). Halaman saat ini memiliki komponen modular namun membutuhkan peremajaan visual terpadu agar mencerminkan standar agensi digital kelas atas (Clay.global), sekaligus menampilkan portofolio ganda (Maniy v2 dan Quant Membran). Lihat `proposal.md` untuk motivasi bisnis dan latar belakang.

## Goals / Non-Goals

**Goals:**
- Mengimplementasikan ritme tata letak dan hierarki tipografi setara Clay.global (ENERGY 3 / RHYTHM 3 / MOTION 2).
- Membangun komponen baru `StudioCapabilities.svelte` (6 pilar rekayasa dengan artefak visual geometris SVG presisi tinggi).
- Mengembangkan `StudioShowcase.svelte` menjadi etalase dual-flagship: Maniy v2 (cockpit finansial) dan Quant Membran (intelijen kuantitatif Bitcoin).
- Menambahkan `StudioManifesto.svelte` dengan tipografi display raksasa ala editorial Swiss.
- Menambahkan `StudioFaq.svelte` berbasis Svelte 5 runes (`$state`) yang interaktif dan ramah aksesibilitas (WAI-ARIA).
- Mempercantik `StudioHeader.svelte` (floating minimalist bar dengan live telemetry beacon) dan `StudioFooter.svelte` (magnetic email CTA).
- Menjamin kepatuhan aksesibilitas: kontras rasio >= 4.5:1, navigasi keyboard penuh, dan pembatalan animasi saat `prefers-reduced-motion: reduce`.
- Menjaga output build 100% statis murni tanpa runtime eksternal yang membengkakkan bundel JavaScript.

**Non-Goals:**
- Mengimpor library grafis 3D berat seperti Three.js atau Spline yang memperlambat waktu muat; seluruh artefak visual dibuat dengan SVG dan CSS geometris presisi.
- Mengubah arsitektur atau kode pada `apps/web` (aplikasi Maniy) maupun `apps/agent` (Cloudflare Worker).

## Decisions

### 1. Hierarki Komponen & Alur Narasi Halaman

Halaman utama (`apps/studio/src/routes/+page.svelte`) dirangkai dengan urutan narasi sebagai berikut:

```
[StudioHeader] -> Floating minimalist header with live telemetry indicator
  │
  ├─► [StudioHero] -> Statement display, thesis, dual action triggers
  │
  ├─► [StudioCapabilities] -> 6-tier bento cards with geometric SVG artifacts
  │
  ├─► [StudioShowcase] -> Dual-flagship horizontal cards: Maniy v2 & Quant Membran
  │
  ├─► [StudioManifesto] -> Oversized typographical Swiss ethos pull-quote
  │
  ├─► [StudioDossier] -> Founder credentials (Lutfi Zain), operating model, verified links
  │
  ├─► [StudioFaq] -> Accessible interactive accordion powered by Svelte 5 runes
  │
  └─► [StudioFooter] -> Direct magnetic contact CTA (lutfi@membran.app) & legal note
```

### 2. Svelte 5 State Architecture pada FAQ Accordion

Komponen `StudioFaq.svelte` mengelola state ekspansi secara lokal menggunakan Svelte 5 runes tanpa dependensi pihak ketiga:
```typescript
let activeIndex = $state<number | null>(null);

function toggle(index: number) {
  activeIndex = activeIndex === index ? null : index;
}
```
Setiap item accordion dilengkapi atribut ARIA yang valid:
- `aria-expanded={activeIndex === i}`
- `aria-controls={"faq-panel-" + i}`
- `id={"faq-panel-" + i}` dengan `role="region"`

### 3. Dual-Flagship Showcase Design

`StudioShowcase.svelte` menampilkan dua karya unggulan dengan kanvas horizontal lebar:
1. **Maniy v2**:
   - Status: `Live Production v2`.
   - Domain: `https://maniy.membran.app`.
   - Visual: Cockpit partition canvas (Spendable runway Rp 12.350.000, Locked reserves Rp 33.500.000, Consolidated Net Worth Rp 45.850.000).
   - Stack: Svelte 5, Cloudflare Edge, Drizzle, PostgreSQL 16.
2. **Quant Membran**:
   - Status: `Production Platform`.
   - Domain: `https://quant.membran.app`.
   - Visual: Quantitative consensus matrix (10 Statistical Families, Macro Valuation Cycle Score, LTTD v3.3 HL-driven backtest: 85.7% win rate, 68.96 Profit Factor).
   - Stack: Bun, Hono API Gateway, Python 3.11, React 19, TradingView Lightweight Charts v5.

### 4. Aset Geometris Bespoke (Zero Generic AI Slop)

Sesuai aturan antislop, tidak ada ilustrasi generik (Undraw/3D blob) atau efek gradien ungu/biru murahan. Keenam kartu kapabilitas menggunakan geometri SVG matematis yang menggambarkan domainnya:
- **01. Deterministic Accounting**: Kisi kubus ortogonal isometrik dengan garis dimensi presisi.
- **02. Evaluated AI Reasoning**: Struktur graf simpul terarah dengan edge terbobot dan verifikasi golden-dataset.
- **03. High-Fidelity Systems**: Wireframe antarmuka berlapis dengan sumbu koordinat.
- **04. Global Edge Runtimes**: Topologi jalur bus jaringan terdistribusi dengan penanda latensi.
- **05. Distributed Tracing**: Diagram gelombang span waktu berjenjang (OTLP tracing).
- **06. Secure ACID Data Engines**: Silinder relasional dengan garis proteksi transaksi atomik.

### 5. Responsivitas dan Desain Fluid

- **Mobile (< 1024px)**: Tata letak mengalir dalam satu kolom, padding horizontal aman (16–24px), target sentuh minimum 44px, ukuran font display berskala fluid (text-3xl ke text-5xl).
- **Desktop (>= 1024px)**: Tata letak bento 2 hingga 3 kolom, lebar kanvas maksimum 1120px berpusat otomatis, kartu horizontal berdampingan dengan rasio visual seimbang.

## Risks / Trade-offs

- **Ukuran Bundel CSS**: Penambahan seksi dan variasi visual dapat menambah utilitas Tailwind. *Mitigasi*: Tailwind CSS v4 compiler otomatis melakukan purge kelas yang tidak terpakai; output build HTML statis tetap di bawah 100 KB gzipped.
- **Aksesibilitas Accordion**: Pengguna screen reader membutuhkan feedback saat item dibuka atau ditutup. *Mitigasi*: Implementasi standar W3C WAI-ARIA Accordion Pattern dengan dukungan penuh keyboard (Enter, Space).
- **Reduced Motion**: Animasi transisi tinggi berisiko mengganggu pengguna sensitif vestibular. *Mitigasi*: Seluruh delay dan transformasi dinonaktifkan di bawah `@media (prefers-reduced-motion: reduce)`.
