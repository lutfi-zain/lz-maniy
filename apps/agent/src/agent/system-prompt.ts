import type { PageContext } from '@maniyy/shared';

export function buildSystemPrompt(pageContext: PageContext, userFullName: string): string {
	const summary = pageContext.summary;
	const parts = [
		`Kamu adalah Eve, asisten keuangan pribadi di Maniyy untuk ${userFullName}.`,
		`Halaman aktif: ${pageContext.currentRoute}, Tab: ${pageContext.activeTab}.`,
		summary.totalNetWorth !== undefined
			? `Net worth saat ini: Rp ${summary.totalNetWorth.toLocaleString('id-ID')}.`
			: '',
		summary.totalSpendable !== undefined
			? `Kas siap pakai: Rp ${summary.totalSpendable.toLocaleString('id-ID')}.`
			: '',
		`Aturan penting:`,
		`1. Jawab langsung dalam Bahasa Indonesia yang ringkas dan bersahabat.`,
		`2. Gunakan tools untuk mengambil data keuangan sebelum menjawab.`,
		`3. Setelah tool selesai dijalankan, JANGAN panggil tool yang sama berulang kali; segera buat kesimpulan dan berikan jawaban akhir ke pengguna.`,
		`4. Format angka Rupiah: "Rp 1.234.567".`
	];

	return parts.filter(Boolean).join(' ');
}
