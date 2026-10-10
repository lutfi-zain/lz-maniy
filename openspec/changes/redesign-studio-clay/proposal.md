## Why

Landing page Membran Studio (`apps/studio`, domain `membran.app`) saat ini telah berfungsi dengan baik, namun struktur visualnya masih menggunakan layout kartu teknis standar. Untuk memperkuat otoritas jenama sebagai software atelier independen dan lab AI terapan kelas dunia, memenuhi standar evaluasi program akselerator (Claude for Startups / Anthropic), dan menampilkan portofolio berbobot tinggi, studio memerlukan revamp menyeluruh yang mengadopsi standar visual, skala tipografi, dan ritme interaktif setara agensi digital papan atas (Clay.global). Revamp ini menyatukan dua karya unggulan studio Membran: Maniy (personal financial reasoning cockpit) dan Quant Membran (institutional-grade Bitcoin quantitative trading system).

## What Changes

- **Clay-Grade Hero Architecture**: Mentransformasi `StudioHero.svelte` dengan tipografi display raksasa ber-tracking ketat, status beacon atelier, dan dua direct action CTA (`Explore Selected Works` dan `Founder Dossier`) tanpa klise AI.
- **6-Tier Interactive Capabilities Grid**: Menambahkan komponen `StudioCapabilities.svelte` berformat grid bento 6-pilar (Deterministic Accounting, Evaluated AI Reasoning, High-Fidelity Systems, Global Edge Runtimes, Distributed Tracing, Secure ACID Data Engines) dengan visual artefak geometris teknis.
- **Dual-Flagship Showcase**: Merekayasa ulang `StudioShowcase.svelte` menjadi pameran karya horizontal full-bleed untuk dua produk unggulan studio:
  1. **Maniy v2** (`https://maniy.membran.app`): Executive Cockpit dan AI Financial Reasoning Agent dengan pemisahan kas Spendable vs cadangan Locked.
  2. **Quant Membran** (`https://quant.membran.app`): Unified Quantitative & Statistical Bitcoin Trading Platform dengan konsensus 10 Statistical Families, Macro Valuation, LTTD, MTTD v2, dan Ichimoku Denoised.
- **Studio Manifesto Pull-Quote**: Menambahkan komponen `StudioManifesto.svelte` dengan tipografi Swiss berukuran masif untuk mengartikulasikan etos atelier rekayasa mandiri tanpa perantara atau beban birokrasi.
- **Interactive FAQ Accordion**: Menambahkan komponen `StudioFaq.svelte` berbasis Svelte 5 runes (`$state`) yang interaktif dan dapat dibuka-tutup dengan aksesibilitas keyboard penuh (Tab, Enter, Space).
- **Floating Header & Live Telemetry**: Memperbarui `StudioHeader.svelte` menjadi bilah minimalis dengan indikator live OTLP tracing ke `phoenix.membran.app`.
- **Conversion Footer**: Memperbarui `StudioFooter.svelte` dengan aksi kontak magnetik langsung ke `lutfi@membran.app` dan legal dossier.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `studio-landing`: Memperluas kontrak perilaku landing page untuk mencakup presentasi 6-tier capabilities grid, etalase ganda Maniy dan Quant Membran, manifesto etos rekayasa, dan accordion FAQ interaktif.

## Impact

- **Affected Code**: `apps/studio/src/lib/components/` (`StudioHero.svelte`, `StudioShowcase.svelte`, `StudioHeader.svelte`, `StudioFooter.svelte`, serta komponen baru `StudioCapabilities.svelte`, `StudioManifesto.svelte`, `StudioFaq.svelte`), `apps/studio/src/routes/+page.svelte`, dan `apps/studio/src/app.css`.
- **Runtime & Deployment**: Static HTML generation via `@sveltejs/adapter-static` yang dideploy ke Cloudflare Pages (`membran-app`).
- **Dependencies**: Tidak ada dependensi NPM baru; menggunakan Svelte 5 runes asli dan Tailwind CSS tema studio.
- **Non-Goals**: Tidak mengubah fungsionalitas inti `apps/web` (aplikasi Maniy) maupun `apps/agent` (Cloudflare Worker backend).
