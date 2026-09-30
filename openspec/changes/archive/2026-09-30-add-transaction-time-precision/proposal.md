# Proposal

## Why

Backend Reedrich menerima `date` / `transactionDate` sebagai ISO `date-time` (detik presisi), tapi frontend memotong semuanya ke hari via `.slice(0, 10)` di store dan `SingleDatePicker` — sehingga transaksi dalam hari yang sama tidak punya urutan yang benar. User butuh presisi jam:menit agar urutan transaksi sesama-hari akurat, tanpa membebani UI list/horizon yang harus tetap bersih.

## What Changes

- Form create transaksi (`TransactionFormDrawer`, mode create): tambah input jam:menit yang terlihat dan bisa diisi user, berdampingan dengan `SingleDatePicker` yang sudah ada.
- Form edit: tambah input jam:menit yang sama, terisi dari jam transaksi yang sedang diedit.
- Detail view (`TransactionDetailView`): baris Tanggal menampilkan jam:menit (format `dFmtTime`), disembunyikan jika jam `00:00` (data warisan date-only).
- Payload create/update (`CreateTransactionPayload`, `CreateTransferPayload`, `UpdateTransactionPayload`): field `date` dikirim sebagai ISO datetime penuh dengan offset lokal (`YYYY-MM-DDTHH:mm:00±HH:MM`), bukan `YYYY-MM-DD`.
- Store (`transaction-form.svelte.ts`): tambah field `time` (`HH:mm`), parsing dari `transactionDate` saat populate, default = jam sekarang saat drawer dibuka.
- Tidak berubah: list ledger, horizon board, cockpit, drawer tables tetap `dFmt()` tanggal saja; sorting memakai ISO penuh sehingga urutan benar tanpa biaya visual.

## Capabilities

### New Capabilities

Tidak ada — semua perubahan adalah modifikasi perilaku yang sudah ada.

### Modified Capabilities

- `transaction-crud`: form create/edit mendukung input jam:menit; detail menampilkan jam; payload memakai ISO datetime penuh. Requirement baru "Transaction Time Precision", skenario create/edit/detail diperbarui.

## Scope

In-scope:
- Input jam:menit di create + edit drawer transaksi (expense, income, transfer — satu komponen form dipakai bersama).
- Tampilan jam di detail view dengan aturan sembunyi-jika-tengah-malam.
- Penggabungan date+time menjadi ISO datetime dengan offset zona lokal di submit handler.
- Parsing jam dari `transactionDate` ISO saat edit/view populate.
- Update unit test `transaction-form.test.ts` untuk field `time`.

Non-goals:
- Mengubah tampilan list ledger, horizon board, cockpit, wallet drawer (tetap tanggal saja).
- Timezone picker / multi-timezone: selalu offset lokal browser.
- Presisi detik: input hanya jam:menit, detik selalu `:00`.
- Recurring template / budget / goal forms tidak disentuh.
