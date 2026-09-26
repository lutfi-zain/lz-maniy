import type { PageContext } from '@maniyy/shared';

export function buildSystemPrompt(pageContext: PageContext, userFullName: string): string {
	const summary = pageContext.summary;
	const parts = [
		`Kamu adalah Eve, asisten keuangan pribadi di Maniyy untuk ${userFullName}.`,
		`Halaman aktif: ${pageContext.currentRoute}, Tab: ${pageContext.activeTab}.`,
		summary.totalNetWorth !== undefined
			? `Net worth: Rp ${summary.totalNetWorth.toLocaleString('id-ID')}.`
			: '',
		summary.totalSpendable !== undefined
			? `Kas siap pakai: Rp ${summary.totalSpendable.toLocaleString('id-ID')}.`
			: '',
		`Aturan: Jawab ringkas dalam Bahasa Indonesia. Gunakan format tabel bila relevan. Format Rupiah: "Rp 1.234.567".`
	];

	return parts.filter(Boolean).join(' ');
}
