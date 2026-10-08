# Proposal: Agent Evaluation & Distributed Observability (Promptfoo + Arize Phoenix)

## Why

Sistem AI Financial Agent pada Maniyy v2 mengelola keputusan finansial kritis (mutasi saldo, estimasi runway, alokasi kantong dompet, dan pelacakan anggaran) yang menuntut zero-hallucination, determinisme pemanggilan tool, dan akuntabilitas token. Saat ini, eksekusi agent beroperasi sebagai "black box" tanpa distributed tracing ke Arize Phoenix, dan harness evaluasi belum mendukung pengujian matriks multi-prompt, integrasi Phoenix experiments, serta proteksi release otomatis di pipeline CI/CD.

Perubahan ini menghadirkan sistem evaluasi pra-rilis (Promptfoo Evals Harness) dengan dataset riil Telegram dan observabilitas terdistribusi waktu-nyata (Arize Phoenix OpenTelemetry Tracing) di seluruh environment (local, CI/CD, dan production).

## What Changes

- **Multi-Prompt Matrix Evaluation Harness**: Menambahkan evaluasi A/B testing multi-prompt pada Promptfoo (`apps/agent/eval/`) untuk membandingkan 3-4 varian system prompt (Baseline Verbose, Compact Token-Optimized, Few-Shot Golden Telegram) terhadap model Gemini dan Groq.
- **Arize Phoenix Experiment & Trace Export**: Mengintegrasikan hasil evaluasi Promptfoo langsung ke Arize Phoenix (`https://phoenix.membran.app`) untuk perbandingan metrik akurasi, latensi, dan efisiensi token side-by-side.
- **CI/CD Pre-Deploy Evaluation Gatekeeper**: Menambahkan pipeline GitHub Actions yang memvalidasi golden dataset sebelum release ke Cloudflare Workers; memblokir deployment jika tool accuracy < 100% atau overall pass rate < 95%.
- **Distributed OTLP/OpenTelemetry Tracing di Cloudflare Worker**: Mengimplementasikan fetch-based OTLP HTTP trace exporter di `apps/agent` yang mengirimkan span ke Arize Phoenix tanpa memblokir runtime streaming (`c.executionCtx.waitUntil`).
- **Multi-Environment Trace Routing**: Mendukung pemisahan trace berdasarkan environment (`maniyy-agent-local`, `maniyy-agent-ci`, `maniyy-agent-production`) menggunakan OpenTelemetry resource attributes (`deployment.environment`, `service.name`, `service.version`).
- **Hierarchical Span Waterfall**: Menghasilkan jejak span lengkap per request mencakup: Ingress HTTP Request, Auth Middleware, Credit Pre-Check, Context & Memory Retrieval, Vercel AI SDK Model Steps (input/output tokens, TTFT, latency), Tool Execution Spans (ReedRich REST & D1 mutation), dan Credit Settlement.
- **Frontend Trace Context Propagation**: Mengirimkan header W3C `traceparent` dari frontend Svelte 5 (`apps/web`) pada setiap request percakapan untuk menghubungkan interaksi UI pengguna dengan trace eksekusi backend.

## Capabilities

### New Capabilities
- `agent-observability`: Distributed tracing end-to-end dengan OpenTelemetry/OTLP ke Arize Phoenix yang mencakup Cloudflare Worker backend, frontend Svelte 5, multi-environment routing, dan hierarki span waterfall terperinci.

### Modified Capabilities
- `agent-eval`: Memperluas spesifikasi evaluasi dengan dukungan multi-prompt A/B matrix testing, integrasi export hasil eval ke Arize Phoenix, dataset berbasis percakapan Telegram riil, serta pre-deployment automated gatekeeper di CI/CD.

## Impact

- **Affected Code Areas**:
  - `apps/agent/src/routes/chat.ts`: Penambahan span instrumentation dan Vercel AI SDK telemetry propagation.
  - `apps/agent/src/middleware/tracing.ts`: Middleware OTLP context propagation dan resource attribute injector.
  - `apps/agent/eval/`: Pembaruan `promptfooconfig.yaml`, provider telemetry, dan matrix dataset.
  - `apps/web/src/lib/stores/chat.svelte.ts`: Injeksi header `traceparent` pada fetch request chat.
  - `.github/workflows/agent-eval.yml`: Workflow CI/CD untuk otomatisasi evaluasi sebelum release.
- **Dependencies**:
  - Backend: `@opentelemetry/api`, `@opentelemetry/exporter-trace-otlp-http` (kompatibel dengan fetch runtime Cloudflare Workers).
  - Dev/CI: `promptfoo` CLI.
- **Non-Goals**:
  - Mengubah struktur database PostgreSQL 16 atau Cloudflare D1.
  - Mengubah logika perhitungan saldo atau formula pacing anggaran di ReedRich.
  - Mengganti sistem otentikasi JWT yang sudah berjalan.
