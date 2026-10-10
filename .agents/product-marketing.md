# Product Marketing Context

**Document version:** v2
**Last updated:** 2026-10-10

## Product Overview
**One-liner:** Executive cockpit dan AI financial reasoning agent untuk kontrol likuiditas harian, proteksi dana cadangan, dan kepastian runway masa depan di bawah payung studio Membran.
**What it does:** Maniy menggabungkan pencatatan multi-kantong secepat kilat via AI agent (Eve) dengan dasbor analitik berbasis Svelte 5. Mengeliminasi ilusi saldo perbankan dengan membedakan kas siap pakai (Spendable) dari dana terkunci (Locked), serta memproyeksikan arus kas hingga berbulan-bulan ke depan via Horizon Board.
**Product category:** Account Intelligence, Executive Financial Cockpit, Personal Financial Management (PFM).
**Product type:** Web SaaS / Edge Application (Svelte 5 + Cloudflare Workers + D1/Postgres).
**Ecosystem architecture:**
- **Studio Entity:** Membran (`https://membran.app`) — Independent Software Atelier & Applied AI Lab.
- **Flagship Application:** Maniy (`https://maniy.membran.app`) — Live Production v2.
- **Observability Suite:** Arize Phoenix (`https://phoenix.membran.app`) — Open OTLP Distributed Tracing.
**Business model:** Freemium dengan langganan Pro untuk multi-wallet tanpa batas, parsing mutasi rekening koran PDF, dan kuota reasoning AI berpresisi tinggi.

## Target Audience
**Target users:** Solopreneur, tech worker, builder, dan kepala keluarga mandiri yang mengelola multi-rekening (bank, e-wallet, crypto/valas) dan membutuhkan kepastian apakah uang kas mereka cukup untuk komitmen masa depan.
**Decision-makers:** Individu pengambil keputusan finansial rumah tangga dan bisnis mandiri.
**Primary use case:** Menginput transaksi harian secara cepat via percakapan kasual tanpa friksi form kaku, sembari menjaga akurasi batas pengeluaran dan proyeksi runway keluarga.
**Jobs to be done:**
- Catat multi-pengeluaran dalam satu kalimat saat mobilitas tinggi: "63k bensin 35k kopi dari dompet utama".
- Pisahkan uang operasional dari uang komitmen sewa, cicilan, dan tabungan agar tidak terpakai tanpa sadar.
- Simulasi skenario pengeluaran mendadak: apakah kas masih aman jika ada kebutuhan keluarga bulan depan?
- Rekonsiliasi mutasi bulanan bank dari dokumen PDF resmi secara otomatis.

## Personas & Studio Leadership
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| **The Pragmatic Builder (Utama)** | Nol gesekan pencatatan, kalkulasi kas bebas riil, integritas data tanpa salah hitung. | Waktu terbatas; aplikasi bank terpisah-pisah; spreadsheet manual merepotkan di ponsel dan mudah rusak rumusnya. | Cukup lempar chat singkat ke Eve; saldo, pagu anggaran, dan buku kas terbarui secara atomik. |
| **The Household CFO** | Kepastian komitmen masa depan (sewa rumah, SPP, dana darurat) dan kesehatan cashflow. | Rasa cemas melihat saldo rekening tampak banyak padahal ada tagihan besar menanti 2 minggu lagi. | Horizon Board dan indikator Safe-to-Spend Runway yang transparan hingga level hari. |
| **The Startup Evaluator (Anthropic / Accelerator)** | Legitimasi organisasi, integritas matematika AI, arsitektur teknis nyata. | Skeptis terhadap proyek anonim atau AI wrapper dangkal tanpa bukti rekayasa mendalam. | Founder Dossier terverifikasi (Lutfi Zain), sistem observabilitas live di `phoenix.membran.app`, dan prinsip zero-hallucination. |

## Problems & Pain Points
**Core problem:** Ilusi nominal saldo perbankan. Orang merasa punya banyak uang karena melihat saldo m-banking hari ini, padahal belum memperhitungkan tagihan berulang dan alokasi cadangan beberapa minggu ke depan.
**Why alternatives fall short:**
- Aplikasi pencatat konvensional: Terlalu banyak klik tombol untuk mencatat kopi Rp 35.000, tidak punya pemahaman konteks bahasa natural, dan pasif tanpa kemampuan analisa.
- Spreadsheet: Tidak praktis dibuka di kasir atau di jalan, rawan error formula saat ada multi-mata uang.
**What it costs them:** Kebocoran pos kas harian, stres akhir bulan, dan risiko terpakainya dana tabungan komitmen.
**Emotional tension:** Beban mental (*cognitive fatigue*) memikirkan alokasi uang dan kecemasan apakah keputusan belanja hari ini akan mengganggu komitmen bulan depan.

## Competitive Landscape
**Direct:** Copilot Money, Lunch Money: fokus pasar barat, integrasi bank otomatis sering putus di lokal, tidak memiliki conversational agent yang bisa manipulasi state UI dan mutasi atomik.
**Secondary:** Notion Financial Template: statis, tidak ada audit trail otomatis, lambat diakses di smartphone.
**Indirect:** Mengingat-ingat saldo di kepala atau mengandalkan mutasi m-banking terpisah: memicu bias nominal semu.

## Differentiation
**Key differentiators:**
- Conversational Multi-Item Bookkeeping: Eksekusi transaksi banyak pos sekaligus dari satu kalimat bahasa sehari-hari.
- Partisi Finansial Keras: Pemisahan tegas Spendable (Kas Siap Pakai) vs Locked (Cadangan Terkunci). Transfer antar kantong tidak merusak Net Worth.
- Horizon Board & Temporal Projection: Papan kalender roll-forward yang memetakan saldo masa depan berdasarkan planned transactions dan recurring template.
- Studio Craft & Radical Editorial Aesthetic: Dibangun oleh Membran Studio dengan standar visual Awwwards, bebas AI-slop, dan performa edge sub-100ms.
- Full Distributed Observability: Setiap panggilan tool dan latensi penalaran dipantau terbuka di Arize Phoenix.

## Objections & Anti-Personas
| Objection | Response |
|-----------|----------|
| "Kenapa tidak pakai form manual saja?" | Chat bahasa alami memangkas waktu pencatatan dari 45 detik menjadi 3 detik, membuat kebiasaan mencatat bertahan bertahun-tahun. |
| "Apakah AI bisa salah menghitung saldo saya?" | Eve beroperasi dengan prinsip Data-First Retrieval dan Zero-Hallucination: seluruh matematika diselesaikan oleh backend database relasional terverifikasi (Postgres 16 / D1), bukan tebakan probabilitas LLM. |
| "Siapa yang bertanggung jawab atas software ini?" | Dikembangkan dan diarsiteki langsung oleh Lutfi Zain di bawah studio independen Membran dengan rekam jejak teknis transparan di GitHub (`@lutfidmz`). |

**Anti-persona:** Spekulan trading harian yang mencari grafik candlestick teknikal, atau pengguna pasif yang tidak mau tahu rincian arus kasnya sendiri.

## Switching Dynamics
**Push:** Lelah mencatat manual satu per satu di aplikasi konvensional atau frustrasi spreadsheet berantakan di HP.
**Pull:** Cukup ketik pesan singkat ke asisten pribadi, semua dompet ter-update dan sisa uang aman belanja langsung terlihat.
**Habit:** Menunda mencatat pengeluaran kecil sampai akhirnya lupa ke mana perginya uang ratusan ribu.
**Anxiety:** Takut repot melakukan migrasi saldo awal dan mengatur kategori.

## Customer Language
**How they describe the problem:**
- "Saldo di bank masih puluhan juta, tapi kenapa pas akhir bulan berasa sesak? Ternyata uang sewa rumah kepakai."
- "Malas banget tiap jajan harus buka aplikasi, klik tambah, pilih dompet, pilih kategori, isi nominal."
**How they describe us:**
- "Tinggal bilang ke Eve, beres semua. Langsung tahu sisa uang jajan yang aman tanpa ganggu tabungan anak."
**Words to use:** Kas siap pakai (spendable), cadangan terkunci (locked), dana aman belanja (runway), proyeksi horizon, pencatatan natural, studio software independen.
**Words to avoid:** Cepat kaya, tips cuan instan, skema investasi, budgeting ribet, AI revolusioner.

## Brand Voice
**Tone:** Tajam, jujur, tenang, dan berbobot.
**Style:** Presisi angka, bahasa lugas Indonesia natural, format tabel terstruktur, tanpa emoji berlebihan, bebas em-dash.
**Personality:** Akuntan pribadi terpercaya dan atelier rekayasa perangkat lunak: tidak menghakimi caramu membelanjakan uang, tetapi selalu menjaga agar komitmen masa depanmu tidak tersentuh.

## Proof Points
**Metrics & Live Footprint:**
- Teruji pada 690+ pemanggilan tool riil dan ratusan mutasi multi-item tanpa diskrepansi database.
- Latensi kueri snapshot instan (< 100ms) di edge Cloudflare Pages dan Workers.
- 11 specialized agent tools terintegrasi penuh untuk mutasi, anggaran, rekening koran, dan kontrol antarmuka.
- CI/CD terotomasi penuh via GitHub Actions ke domain produksi `membran.app` dan `maniy.membran.app`.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Kecepatan Input | Parsing multi-transaksi dalam satu pesan teks tunggal. |
| Proteksi Komitmen | Partisi isolasi saldo Spendable vs Locked secara deterministik. |
| Audit Dokumen Bank | Ekstraksi mutasi rekening koran PDF langsung ke dalam draft pencatatan. |
| Transparansi Sistem | Open distributed tracing live di `https://phoenix.membran.app`. |

## Goals
**Business goal:** Menjadikan Membran studio software independen bereputasi tinggi dengan Maniy sebagai standar acuan personal finance cockpit bertenaga AI reasoning, serta mengamankan slot resmi di program Claude for Startups ($1.000 API credits + 1 tahun Team Plan).
**Conversion action:** Kunjungan ke `membran.app`, pendaftaran akun Maniy, dan pencatatan transaksi pertama via Eve.

## Changelog
*Newest first. One line per revision: what changed and why.*
- v2 (2026-10-10) — Repositioned under Membran studio (membran.app); integrated verified founder dossier (Lutfi Zain), live telemetry infrastructure (phoenix.membran.app), and complete rebrand from Maniyy to Maniy.
- v1 (2026-10-10) — Initial context: integrasi mendalam dari use case riil 45 hari Eve (pencatatan multi-item, pemisahan spendable vs locked, proyeksi runway situasional, mitigasi ilusi nominal) untuk positioning produk dan aplikasi Claude for Startups.
