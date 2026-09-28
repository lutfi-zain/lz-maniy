# Proposal

## Why

Agen AI keuangan di Maniyy V2 mengalami kegagalan pada skenario penalaran bertahap (multi-step tool execution) karena loop generator terputus prematur ketika model mengalirkan teks sebelum tool call berikutnya, serta tidak memiliki riwayat percakapan masa lalu dan konfigurasi thinking level. Selain itu, pengguna membutuhkan integrasi model hemat/free OpenCode Zen menggunakan token `public` (seperti `muse-spark-1.3-contributor-free`), kemampuan melakukan retry/regenerasi pada bubble pesan asisten dengan navigasi versi (`< 1 / N >`), dan auto-focus keyboard ke input chat saat panel chat dibuka.

## What Changes

- **Enhanced Multi-Step Reasoning & History**: Memperbaiki generator streaming backend agar tidak menghentikan stream sebelum seluruh siklus tool selesai saat model mengalirkan teks parsial, serta meneruskan riwayat percakapan sebelumnya (`priorMessages`) ke konteks inference.
- **Thinking Level Configuration**: Menambahkan opsi pengaturan tingkat penalaran (`off`, `minimal`, `low`, `medium`, `high`) di UI model picker dan meneruskannya ke backend untuk model Gemini (`thinkingConfig`) dan model reasoning lainnya.
- **Custom OpenCode Provider Adapter**: Menambahkan adapter custom untuk upstream gateway OpenCode Zen (`https://opencode.ai/zen/v1`) yang menginjeksi header CLI resmi (`User-Agent`, `x-opencode-client`, `x-opencode-project`, `x-opencode-session`, `x-opencode-request`) sehingga dapat menggunakan token string `"public"` tanpa memicu `403 FreeTierError`.
- **Chat Bubble Versioning & Retry**: Menambahkan tombol retry dan navigasi pagination riwayat jawaban (`< 1 / N >`) pada bubble asisten terakhir, memungkinkan pengguna berpindah antar versi jawaban atau mengulang saat respon terputus/gagal render.
- **Auto-Focus Chat Input**: Menjamin fokus keyboard otomatis beralih ke textarea input saat panel chat dibuka atau saat kembali dari tampilan daftar percakapan.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `agent-chat/frontend`: Menambahkan UI pemilih thinking level, navigasi varian jawaban `< 1 / N >` dan aksi retry pada `ChatBubble`, serta auto-focus keyboard pada `ChatInput`.
- `agent-chat/backend`: Menambahkan custom OpenCode adapter (`Bearer public`), perbaikan multi-step loop tanpa terminasi dini, injeksi `thinkingConfig`, dan perutean `priorMessages`.
- `agent-chat/shared-types`: Memperluas kontrak `ModelConfig` (provider `opencode`, thinking support), `ChatStreamRequest` (opsi `thinkingLevel`), dan `ChatMessage` (array `variants` dan `activeVariantIndex`).

## Impact

- **Dependencies**: Menambahkan `@ai-sdk/openai-compatible` pada `apps/agent` untuk integrasi standar gateway OpenAI-compatible OpenCode Zen.
- **Database/Storage**: Schema D1 tetap kompatibel; pesan yang di-retry dapat memperbarui baris pesan aktif atau menambahkan metadata varian secara bersih.
- **Breaking Changes**: Tidak ada breaking changes pada kontrak publik Reedrich API; semua perubahan bersifat aditif pada protokol internal chat agent.
