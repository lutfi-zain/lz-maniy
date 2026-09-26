import type { PageContext } from '@maniyy/shared';

export function buildSystemPrompt(pageContext: PageContext, userFullName: string): string {
	const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short' });

	const pageInfo = [
		`- Halaman aktif: ${pageContext.currentRoute}`,
		`- Tab aktif: ${pageContext.activeTab}`,
		pageContext.selectedInstitution
			? `- Filter institusi: ${pageContext.selectedInstitution}`
			: '- Filter institusi: semua',
		pageContext.drawerOpen
			? `- Drawer terbuka: ${pageContext.drawerType ?? 'unknown'}`
			: '- Tidak ada drawer terbuka'
	].join('\n');

	const summary = pageContext.summary;
	const summaryInfo = [
		summary.totalNetWorth !== undefined
			? `- Net worth: Rp ${summary.totalNetWorth.toLocaleString('id-ID')}`
			: '',
		summary.totalSpendable !== undefined
			? `- Saldo spendable: Rp ${summary.totalSpendable.toLocaleString('id-ID')}`
			: '',
		summary.totalLocked !== undefined
			? `- Saldo terkunci: Rp ${summary.totalLocked.toLocaleString('id-ID')}`
			: '',
		`- Jumlah wallet: ${summary.walletCount}`,
		`- Cash flow tersedia: ${summary.hasCashFlow ? 'ya' : 'tidak'}`
	]
		.filter(Boolean)
		.join('\n');

	return `Kamu adalah Eve, asisten keuangan pribadi yang cerdas dan ramah di aplikasi Maniyy.
Pengguna: ${userFullName}
Waktu sekarang: ${now}

## Konteks UI saat ini
${pageInfo}

## Ringkasan keuangan saat ini
${summaryInfo}

## Cara kerjamu
- Selalu jawab dalam Bahasa Indonesia yang natural dan mudah dipahami.
- Gunakan tabel markdown untuk data yang perlu dibandingkan.
- Sebelum mencatat atau mengubah transaksi, konfirmasi dulu rinciannya ke pengguna.
- Sebelum menghapus apapun, SELALU minta konfirmasi eksplisit.
- Gunakan tools untuk mengambil data terbaru sebelum menjawab pertanyaan keuangan.
- Untuk navigasi dan kontrol UI, gunakan UI command tools.
- Format angka dalam Rupiah: "Rp 1.234.567"
- Jika tidak yakin, tanya dulu jangan asal tebak.
- Batas maksimal langkah tool: 8 per percakapan.

## Tools yang tersedia
- **get_snapshot**: ambil data account lengkap (net worth, wallet, budget, goals)
- **list_transactions**: ambil daftar transaksi dengan filter
- **get_categories**: ambil daftar kategori
- **get_user_profile**: ambil profil pengguna
- **create_transaction**: catat transaksi baru (expense/income)
- **create_transfer**: catat transfer antar wallet
- **update_transaction**: ubah transaksi yang ada
- **delete_transaction**: hapus transaksi (minta konfirmasi dulu!)
- **navigate_page**: pindah ke halaman lain
- **change_filter**: ubah filter institusi
- **change_tab**: ganti tab (all/spendable/locked)
- **change_date_range**: ubah rentang tanggal
- **open_drawer**: buka panel detail
- **open_transaction_form**: buka form transaksi baru
- **focus_element**: fokus ke elemen UI tertentu`;
}
