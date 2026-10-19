# AI Engineering Master Walkthrough & Evaluation Curriculum

> **Standard:** Aligned with [roadmap.sh/ai-engineer](https://roadmap.sh/ai-engineer)  
> **Repository:** `lz-maniy` (`apps/agent`)  
> **Runtime:** Cloudflare Workers (V8 Isolate) + Hono + Vercel AI SDK  
> **Evaluation Stack:** Promptfoo (CI/CD) + Arize Phoenix (OTel/Spans/Datasets) + Langfuse (Scores/Telemetry)  

Dokumen ini adalah cetak biru *executable curriculum* ("Code-as-Curriculum") untuk mempelajari arsitektur produksi AI Agent dan 5 Level AI Evaluation Pyramid, serta mereplikasi agen baru dari awal dalam waktu 5 menit.

Setiap babak di bawah terhubung langsung ke kode sumber produksi melalui tag anotasi terstandarisasi:
```
@walkthrough <stage>.<step>:<slug>
```

---

## 1. Arsitektur Runtime & 5-Level AI Evaluation Pyramid

```
+-------------------------------------------------------------------------------------------------+
|                                    AI AGENT RUNTIME PIPELINE                                    |
+-------------------------------------------------------------------------------------------------+
|  User Request ---> [Hono /api/chat] ---> [Vercel AI SDK: streamText] ---> Edge SSE to User      |
|                          |                                                                      |
|                          +---> Dynamic Tool Calling (Zod Schemas & Tenant Boundary)             |
|                          +---> Token Estimation & Compaction Worker                             |
|                          +---> Persistent D1 Memory Injection                                   |
+-------------------------------------------------------------------------------------------------+
|                                 THE 5-LEVEL AI EVALUATION PYRAMID                               |
+-------------------------------------------------------------------------------------------------+
| LEVEL 4: Distributed Tracing & Post-Production Telemetry                                        |
|          -> OpenInference semantic spans to Arize Phoenix & Langfuse Scores API                |
|          -> W3C traceparent propagation & Telegram alerts on severe drift                       |
|          Anchor: src/observability/tracer.ts & src/middleware/tracing.ts                        |
+-------------------------------------------------------------------------------------------------+
| LEVEL 3: Offline Benchmarking & Golden Datasets                                                 |
|          -> Arize Phoenix Prompt Versioning Repositories & Experiment Suites                    |
|          -> 14-Category Golden Domain Dataset Taxonomy (820 lines of golden assertions)         |
|          Anchor: eval/phoenix-suite.ts & eval/dataset.ts                                        |
+-------------------------------------------------------------------------------------------------+
| LEVEL 2: Pre-Deployment CI Evaluation Gate                                                      |
|          -> Promptfoo Matrix (Baseline vs Compact vs Few-Shot across Gemini 3.7, 3.8, Groq)     |
|          -> Model-graded LLM Grader (OmpGraderProvider) & >= 95% pass rate gate in CI           |
|          Anchor: eval/promptfooconfig.yaml & eval/grader.ts                                     |
+-------------------------------------------------------------------------------------------------+
| LEVEL 1: Decoupled Semantic LLM-as-a-Judge                                                      |
|          -> Zero-temperature CoT rubrics (Financial Soundness, Persona & Currency Governance)   |
|          -> D1 eval_queue leasing & Worker scheduled() cron to avoid edge subrequest limits     |
|          Anchor: src/observability/async-judge.ts, src/routes/eval.ts, 0006_eval_flywheel.sql   |
+-------------------------------------------------------------------------------------------------+
| LEVEL 0: Deterministic Invariants & Formatting (Zero Added Latency/Tokens)                      |
|          -> Numeric Grounding (verifikasi nominal rupiah tidak halusinasi dari prompt/tools)    |
|          -> Currency Governance (forbid $ / enforce format Rp) & Emoji Elimination              |
|          Anchor: src/observability/evaluators.ts                                                |
+-------------------------------------------------------------------------------------------------+
|                                    CLOSED-LOOP DATASET FLYWHEEL                                 |
|  Production Anomaly / Negative Feedback ---> [4-Pass PII Scrubber] ---> D1 eval_dataset_cands   |
|  ---> [bun run eval:export-candidates] ---> Sync to eval/dataset.ts & Phoenix/Langfuse Datasets |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Master Curriculum Table (6 Stages)

Semua langkah di bawah diurutkan secara kronologis menggunakan zero-padded 2-digit format sehingga pencarian teks (`grep -rn "@walkthrough"`) menghasilkan urutan belajar yang sempurna:

| Step Tag | Topik Roadmap.sh | Target File Anchor | Ringkasan Konsep Teknis | Referensi Teori |
| :--- | :--- | :--- | :--- | :--- |
| **`01.01:worker-entrypoint`** | Edge Runtime & Lifecycle | `src/index.ts` | Menginisialisasi runtime V8 isolate Cloudflare Worker yang mengekspor handler `fetch` (HTTP streaming) dan `scheduled` (cron queue draining). | [Cloudflare Workers](https://developers.cloudflare.com/workers/) \| `okf://knowledge/vps-infra/concepts/hyperdrive-edge.md` |
| **`01.02:environment-bindings`** | Secrets & Typed Bindings | `wrangler.toml` | Mendeklarasikan type-safe environment variables, database D1 bindings, KV namespace, dan interval cron trigger tanpa hardcode secrets. | [Worker Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) \| `okf://knowledge/vps-infra/concepts/omp-gateway.md` |
| **`01.03:hono-routing-layer`** | Edge HTTP & Middleware | `src/index.ts` | Routing REST/SSE berperforma tinggi menggunakan Hono dengan middleware autentikasi Bearer dan distributed tracing propagation. | [Hono Routing](https://hono.dev/getting-started/cloudflare-workers) \| `okf://knowledge/vps-infra/concepts/hyperdrive-edge.md` |
| **`02.01:multi-provider-model`** | Provider Abstraction & Routing | `src/agent/models.ts` | Factory multi-model Vercel AI SDK yang mengabstraksi Gemini 3.8 Flash, Groq Llama, dan OpenAI dengan parameter temperature terstandarisasi. | [AI SDK Providers](https://sdk.vercel.ai/docs/foundations/providers-and-models) \| `okf://knowledge/langfuse-vercel-ai-sdk/fase-2-agentic-loops-tool-calls-dan-multimodal.md` |
| **`02.02:edge-sse-streaming`** | Real-Time SSE Protocol | `src/routes/chat.ts` | Streaming token LLM real-time ke klien browser menggunakan Server-Sent Events (SSE) via `streamText.toDataStreamResponse()`. | [AI SDK Streaming](https://sdk.vercel.ai/docs/ai-sdk-core/streaming) \| `okf://knowledge/langfuse-vercel-ai-sdk/fase-2-agentic-loops-tool-calls-dan-multimodal.md` |
| **`02.03:resilient-fallback`** | Error Recovery & Synthesis | `src/routes/chat.ts` | Pola pemulihan `attemptFallbackSynthesis` untuk merangkum hasil eksekusi tools ketika model utama gagal atau terkena timeout streaming. | [AI Fallback Patterns](https://roadmap.sh/ai-engineer) \| `okf://knowledge/ai-evals-course/fase-1-fondasi-dan-stochastic-shift.md` |
| **`03.01:system-prompt-ssot`** | Single Source of Truth Prompts | `src/agent/system-prompt.ts` | Mengonstruksi system prompt dinamis secara modular (persona, format mata uang, temporal anchors, user memories) yang sinkron dengan benchmark promptfoo. | [Prompt Engineering](https://www.promptingguide.ai/) \| `okf://knowledge/langfuse-vercel-ai-sdk/fase-3-centralized-prompt-management.md` |
| **`03.02:zod-tool-definition`** | Type-Safe Tool Calling | `src/agent/tools/financial.ts` | Mendefinisikan signature function calling dengan skema Zod ketat yang memvalidasi parameter input sebelum fungsi domain dieksekusi. | [AI SDK Tools](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling) \| `okf://knowledge/ai-evals-course/fase-5-agentic-evaluation-trajectory-dan-state.md` |
| **`03.03:tool-execution-guard`** | Tenant Isolation & Security | `src/agent/tools/mutations.ts` | Boundary keamanan eksekusi mutasi finansial yang mengisolasi `userId` dan mencegah modifikasi data lintas pengguna (cross-tenant safety). | [AI Security & Defense](https://roadmap.sh/ai-engineer) \| `okf://knowledge/ai-evals-course/fase-5-agentic-evaluation-trajectory-dan-state.md` |
| **`04.01:history-sanitization`** | Multi-Turn Conversation State | `src/agent/history.ts` | Membersihkan urutan role percakapan agar mematuhi aturan strict alternation (user/assistant) dan mencegah format payload ditolak oleh Gemini/Claude. | [Chat State Management](https://roadmap.sh/ai-engineer) \| `okf://knowledge/ai-evals-course/fase-2-taksonomi-kegagalan-dan-error-analysis.md` |
| **`04.02:token-compaction`** | Context Window Optimization | `src/agent/compaction.ts` | Mengestimasi konsumsi token dan memicu peringkasan percakapan secara asinkron saat context window melewati batas ambang 70%. | [Context Compaction](https://roadmap.sh/ai-engineer) \| `okf://knowledge/ai-evals-course/fase-2-taksonomi-kegagalan-dan-error-analysis.md` |
| **`04.03:long-term-memory`** | Persistent Semantic Memory | `src/agent/tools/memory.ts` | Ekstraksi dan penyimpanan preferensi penting pengguna secara terstruktur ke SQLite D1 untuk disuntikkan kembali pada sesi berikutnya. | [Agent Memory](https://roadmap.sh/ai-engineer) \| `okf://knowledge/vps-infra/concepts/hindsight-memory.md` |
| **`05.01:eval-code-grounding`** | Level 0: Deterministic Evals | `src/observability/evaluators.ts` | Evaluasi kode instan ($0 token cost) untuk numeric grounding (angka harus berasal dari prompt/tool), validasi Rupiah, dan larangan emoji. | [Arize Code Evaluators](https://arize.com/docs/phoenix/evaluation/code-evaluators) \| `okf://knowledge/ai-evals-course/fase-3-multi-tier-evaluator-dan-rubric-engineering.md` |
| **`05.02:async-llm-judge`** | Level 1: Semantic CoT Judge | `src/observability/async-judge.ts`, `src/routes/eval.ts`, `db/migrations/0006_eval_flywheel.sql` | Evaluasi semantik model-graded (Financial Soundness & Persona) menggunakan Gemini 3.8 Flash temp 0.0 out-of-band via D1 queue dan cron worker. | [Arize LLM Evaluators](https://arize.com/docs/phoenix/evaluation/llm-evaluators) \| `okf://knowledge/ai-evals-course/fase-3-multi-tier-evaluator-dan-rubric-engineering.md` |
| **`05.03:eval-promptfoo-gate`** | Level 2: Pre-Deploy CI Gate | `eval/promptfooconfig.yaml`, `eval/grader.ts` | Matrix benchmarking otomatis menguji varian prompt (baseline/compact/fewshot) lintas model di CI dengan syarat kelulusan $\ge 95\%$ sebelum deploy. | [Promptfoo CI](https://promptfoo.dev/docs/intro) \| `okf://knowledge/ai-evals-course/fase-6-pre-deployment-cicd-dan-matrix-optimization.md` |
| **`05.04:eval-phoenix-suite`** | Level 3: Offline Benchmarks & Golden Datasets | `eval/phoenix-suite.ts`, `eval/dataset.ts` | Sinkronisasi taksonomi 14 kategori bug ke Arize Phoenix dataset dan prompt version repository untuk eksperimen regresi offline mendalam. | [Arize Datasets](https://arize.com/docs/phoenix/datasets) \| `okf://knowledge/ai-evals-course/fase-4-dataset-engineering-dan-synthetic-curation.md` |
| **`05.05:eval-otel-tracing`** | Level 4: Live Tracing & Telemetry | `src/observability/tracer.ts`, `src/middleware/tracing.ts` | Ekspor distributed trace OTLP Protobuf ke Phoenix dan Langfuse Scores API secara non-blocking dengan semantic conventions OpenInference. | [OpenInference](https://github.com/Arize-ai/openinference) \| `okf://knowledge/ai-evals-course/fase-7-post-production-observability-dan-drift.md` |
| **`05.06:pii-scrubber`** | Data Governance: PII Sanitizer | `src/observability/pii-scrubber.ts` | Algoritma sanitasi 4-pass deterministik yang menghapus token, NIK, nomor rekening, dan email namun tetap menjaga integritas angka nominal rupiah. | [Data Privacy & PII](https://roadmap.sh/ai-engineer) \| `okf://knowledge/ai-evals-course/fase-4-dataset-engineering-dan-synthetic-curation.md` |
| **`05.07:dataset-flywheel`** | Closed-Loop CI Regression Sync | `src/observability/flywheel.ts`, `eval/flywheel-sync.ts`, `src/db/queries.ts` | Otomasi kurasi: anomali produksi disaring PII, distaging ke D1, dan diekspor via CLI ke `dataset.ts` untuk menjadi golden test case permanen. | [Continuous Flywheel](https://hamel.dev/evals/) \| `okf://knowledge/ai-evals-course/fase-1-fondasi-dan-stochastic-shift.md` |
| **`06.01:scaffold-new-agent`** | New Agent Replication Recipe | `apps/agent/WALKTHROUGH.md` | Panduan praktis langkah demi langkah untuk mereplikasi agen baru lengkap dengan runtime, provider, tools, dan harness evaluasi dalam 5 menit. | [AI Engineer Roadmap](https://roadmap.sh/ai-engineer) \| `okf://knowledge/ai-evals-course/` |

---

## 3. Operational CLI Cheatsheet

### 3.1 Navigasi & Grep Kode Kurikulum
```bash
# Lihat seluruh urutan kurikulum secara kronologis
grep -rn "@walkthrough" apps/agent/src apps/agent/eval apps/agent/db apps/agent/*.toml | sort

# Bedah arsitektur Evaluasi (Level 0 sampai Flywheel)
grep -rn "@walkthrough 05" apps/agent/ -A 4

# Cari step spesifik beserta catatan konsep dan referensi teorinya
grep -rn "@walkthrough 05.02" apps/agent/ -A 4
```

### 3.2 Menjalankan AI Evaluation Suites
```bash
# Jalankan unit test seluruh komponen agent dan integritas walkthrough
bun run test:agent

# Jalankan pre-deployment CI matrix benchmark (Promptfoo)
cd apps/agent && bunx promptfoo eval -c eval/promptfooconfig.yaml

# Jalankan sync offline suite & datasets ke Arize Phoenix
bun run phoenix:sync

# Sinkronkan prompt repositories dan tracing metadata ke Langfuse
bun run observability:sync

# Ekspor kegagalan produksi (eval_dataset_candidates) ke CI golden dataset (dataset.ts)
bun run eval:export-candidates
```

---

## 4. Stage 06: 5-Minute Agent Replication Recipe

Gunakan resep ini untuk membuat agen AI baru yang tangguh di folder baru (misal `apps/my-new-agent/`):

### 4.1 Minimal 6-File Manifest
1. `package.json`: Dependency inti (`@ai-sdk/google`, `@ai-sdk/groq`, `ai`, `hono`, `zod`, `wrangler`, `vitest`, `promptfoo`).
2. `wrangler.toml`: Konfigurasi Worker, binding database D1, dan cron trigger `*/5 * * * *`.
3. `src/index.ts`: Entrypoint Hono mengekspor handler `fetch` (HTTP SSE) dan `scheduled` (eval queue drainer).
4. `src/agent/models.ts`: Factory provider Vercel AI SDK dengan fallback model dinamis.
5. `src/routes/chat.ts`: Endpoint SSE `streamText` dengan error recovery synthesis.
6. `eval/promptfooconfig.yaml`: Pre-deployment CI matrix benchmark menguji baseline vs compact prompts.

### 4.2 Langkah Eksekusi CLI Cepat

```bash
# 1. Inisialisasi folder dan dependencies
mkdir -p apps/my-new-agent/src/agent apps/my-new-agent/src/routes apps/my-new-agent/eval
cd apps/my-new-agent
bun init -y
bun add ai @ai-sdk/google @ai-sdk/groq hono zod @opentelemetry/api
bun add -d wrangler vitest promptfoo typescript @cloudflare/workers-types

# 2. Salin template dasar dari apps/agent sesuai anchor:
#    - src/index.ts        <-- @walkthrough 01.01 & 01.03
#    - wrangler.toml       <-- @walkthrough 01.02
#    - src/agent/models.ts <-- @walkthrough 02.01
#    - src/routes/chat.ts  <-- @walkthrough 02.02 & 02.03
#    - evaluators.ts       <-- @walkthrough 05.01

# 3. Setup environment lokal
cp ../agent/.dev.vars.example .dev.vars
# Masukkan API Key (GEMINI_API_KEY, GROQ_API_KEY) di .dev.vars

# 4. Jalankan server lokal
bun run wrangler dev --port 8787

# 5. Uji streaming SSE via curl di terminal lain (Smoke Test < 30s)
curl -N -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Halo, perkenalkan dirimu"}]}'

# 6. Jalankan CI matrix benchmark lokal
bunx promptfoo eval -c eval/promptfooconfig.yaml
```
Jika respon SSE streaming mengalir dan test Promptfoo lulus $\ge 95\%$, agen baru kamu siap dideploy ke produksi Cloudflare Workers dengan arsitektur enterprise standar Maniy.
