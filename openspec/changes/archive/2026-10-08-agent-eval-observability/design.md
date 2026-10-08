# Design: Agent Evaluation & Distributed Observability (Promptfoo + Arize Phoenix)

## Context

Sistem Maniyy v2 saat ini memiliki dua komponen utama:
1. `apps/web`: Single Page Application berbasis Svelte 5 runes yang berinteraksi dengan pengguna.
2. `apps/agent`: Backend AI agent berbasis Cloudflare Workers (Hono runtime) yang menggunakan Vercel AI SDK (`streamText`) dan ReedRich REST tools untuk mengelola data finansial.

Di sisi server host (VPS `VM-3-103-ubuntu`), kita telah menjalankan instance container **Arize Phoenix** (`phoenix-observability`) pada port `6006` (Web UI) dan `4318` (OTLP Ingestion), yang terhubung ke PostgreSQL 16 `phoenix` database serta diekspos secara aman ke publik via Cloudflare Tunnel di `https://phoenix.membran.app`. Phoenix diproteksi menggunakan sistem autentikasi ganda: Multi-User RBAC untuk UI dan System Bearer Token (`PHOENIX_ADMIN_SECRET`) untuk OTLP ingestion.

Di sisi pengujian, `apps/agent/eval/` memiliki kerangka awal Promptfoo dan dataset 23+ skenario dari riwayat Telegram pengguna riil, namun belum diintegrasikan ke Phoenix experiments, belum mendukung A/B testing multi-prompt matrix, dan belum memiliki automated gatekeeper di CI/CD.

## Goals / Non-Goals

**Goals:**
- Mengimplementasikan distributed tracing berbasis OpenTelemetry OTLP HTTP di Cloudflare Worker (`apps/agent`) tanpa menambah latensi streaming pengguna (zero TTFT impact).
- Menghubungkan interaksi browser (Svelte 5 UI) dengan eksekusi backend melalui standar W3C `traceparent` context propagation.
- Mengelompokkan traces berdasarkan environment (`local`, `ci`, `production`) ke dalam project Phoenix terpisah (`maniyy-agent-local`, `maniyy-agent-ci`, `maniyy-agent-production`).
- Menghasilkan span waterfall terstruktur: Root HTTP Ingress -> Auth & Credit Pre-Check -> AI Inference Steps -> Tool Executions -> Credit Settlement.
- Menyediakan Promptfoo multi-prompt matrix evaluation untuk membandingkan 3 varian prompt (Baseline, Compact Token-Optimized, Few-Shot Golden) terhadap metrik akurasi tool, latensi, dan biaya token.
- Mengintegrasikan pipeline CI/CD GitHub Actions sebagai automated quality gatekeeper yang memblokir release jika pass rate < 95% atau tool accuracy < 100%.

**Non-Goals:**
- Menggunakan NodeSDK OpenTelemetry yang memerlukan native Node.js TCP sockets (tidak didukung Cloudflare Workers).
- Mengizinkan frontend browser mengirim span langsung dengan secret token ke Phoenix (proteksi kredensial ingestion).
- Mengubah skema database PostgreSQL 16 atau Cloudflare D1.

## Decisions

### Decision 1: Fetch-Based OTLP Exporter dengan `c.executionCtx.waitUntil`
- **Konsep**: Cloudflare Workers tidak mendukung modul bawaan Node.js seperti `net` atau `@opentelemetry/sdk-node`.
- **Keputusan**: Menggunakan fetch-based OTLP HTTP exporter (`@opentelemetry/exporter-trace-otlp-http`) yang mengirimkan span payloads JSON/Protobuf ke `https://phoenix.membran.app/v1/traces`.
- **Flush Lifecycle**: Pengiriman batch span dilakukan secara non-blocking di dalam `c.executionCtx.waitUntil()`. Dengan cara ini, response streaming ke pengguna tertutup terlebih dahulu tanpa terhambat oleh network roundtrip pengiriman telemetri ke VPS.

```
[User Browser] <=== (Stream Selesai: 200 OK) === [Cloudflare Worker]
                                                         │
                                           c.executionCtx.waitUntil(...)
                                                         │
                                                         ▼ HTTP POST /v1/traces
                                            [Arize Phoenix on VPS]
```

### Decision 2: W3C `traceparent` Distributed Context Propagation
- **Keputusan**: Frontend Svelte 5 (`apps/web/src/lib/stores/chat.svelte.ts`) menghasilkan W3C trace context saat pengguna menekan tombol kirim pesan, lalu menyematkan header:
  `traceparent: 00-${traceId}-${spanId}-01`
- **Eksekusi Backend**: Middleware tracing pada Hono mengekstrak header ini dan menjadikannya parent context untuk seluruh root span di backend.
- **Keuntungan**: CEO atau tim teknis dapat melihat satu trace utuh di Phoenix, mulai dari klik user di browser hingga eksekusi mutasi di database.

### Decision 3: Multi-Environment Partitioning via Resource Attributes
- **Keputusan**: Setiap span disuntikkan OpenTelemetry Resource Attributes:
  - `service.name`: `maniyy-agent`
  - `deployment.environment`: Diambil dari environment variable (`local` | `ci` | `production`)
  - `service.version`: Git commit SHA aktif
  - `project.name` / header `x-phoenix-project`: Memetakan ke project Phoenix `maniyy-agent-local`, `maniyy-agent-ci`, atau `maniyy-agent-production`.
- **Rationale**: Memungkinkan filter multi-environment layaknya Elastic APM / Datadog di dashboard Phoenix.

### Decision 4: Multi-Prompt Matrix Evaluation di Promptfoo
- **Keputusan**: Menyediakan 3 template prompt yang dievaluasi secara serentak di `apps/agent/eval/`:
  1. `prompts/system-baseline.txt`: System prompt verbose standar yang mencakup semua instruksi detail.
  2. `prompts/system-compact.txt`: Versi padat yang memangkas token input 30–40% untuk efisiensi biaya.
  3. `prompts/system-fewshot.txt`: Versi yang menyertakan contoh riil percakapan Telegram pengguna.
- **Provider Output**: Provider Promptfoo mengekspor hasil benchmark dan token breakdown ke Phoenix experiments (`maniyy-agent-evals`).

### Decision 5: CI/CD Automated Quality Gatekeeper
- **Keputusan**: Membuat workflow GitHub Actions (`.github/workflows/agent-eval.yml`):
  1. Checkout branch & install dependencies via Bun.
  2. Jalankan unit test (`bun run test:agent`).
  3. Jalankan Promptfoo eval dengan golden dataset 23+ kasus finansial riil.
  4. Lakukan evaluasi assert: jika ada kegagalan pada kategori `transaction_record` atau pass rate keseluruhan < 95%, gagalkan build (Exit Code 1).
  5. Hanya jika PASS, langkah `wrangler deploy` diizinkan berjalan.

## Risks / Trade-offs

- **Risk: Worker Egress Limit & Latensi VPS**: Jika koneksi dari Cloudflare Worker ke VPS mengalami kendala, pengiriman trace bisa timeout.
  - **Mitigasi**: Seluruh pengiriman trace dibungkus dalam timeout 3 detik di background (`waitUntil`) dengan try/catch aman sehingga error observabilitas tidak pernah menggagalkan respon chat pengguna.
- **Risk: Keamanan Token Ingestion Phoenix**: Token `PHOENIX_ADMIN_SECRET` tidak boleh bocor ke client.
  - **Mitigasi**: Token ingestion hanya disimpan sebagai Cloudflare Worker secret (`wrangler secret put PHOENIX_ADMIN_SECRET`) dan env variable di CI/CD runner. Frontend browser sama sekali tidak memegang token ini.
- **Risk: Biaya Evaluasi LLM di CI/CD**: Menjalankan 23 kasus terhadap 3 prompt dan multi-model bisa memakan kuota token.
  - **Mitigasi**: Di CI/CD runner, evaluasi dibatasi pada model utama `google-antigravity/gemini-3.7-flash` via OMP Gateway, yang memiliki biaya per-token sangat rendah dengan latensi sub-detik.
