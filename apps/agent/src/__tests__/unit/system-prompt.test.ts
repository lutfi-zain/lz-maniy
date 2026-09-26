import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../agent/system-prompt.js';
import type { PageContext } from '@maniyy/shared';

describe('buildSystemPrompt - Dynamic Temporal & Accounting Rules', () => {
	const sampleContext: PageContext = {
		currentRoute: '/ledger',
		activeTab: 'spendable',
		selectedInstitution: 'BCA',
		drawerOpen: false,
		summary: {
			totalNetWorth: 15266837.21,
			totalSpendable: 705792.15,
			totalLocked: 14561045.06,
			walletCount: 17,
			hasCashFlow: true
		}
	};

	it('dynamically computes WIB dates without static hardcoding', () => {
		const prompt = buildSystemPrompt(sampleContext, 'Lutfi Zain');
		expect(prompt).toContain('Lutfi Zain');
		expect(prompt).toContain('WAKTU & KALENDER SISTEM (Dihitung Dinamis WIB):');

		// Check dynamic year/month format (YYYY-MM-01)
		const now = new Date();
		const year = now.getFullYear();
		expect(prompt).toMatch(new RegExp(`${year}-\\d{2}-01`));
	});

	it('embeds zero-delta transfer accounting rule', () => {
		const prompt = buildSystemPrompt(sampleContext, 'Lutfi Zain');
		expect(prompt).toContain("TIDAK MENGUBAH Net Worth (Delta Net Worth = 0)");
		expect(prompt).toContain("JANGAN PERNAH menghitung transfer sebagai beban pengeluaran net worth");
	});

	it('embeds multi-currency awareness', () => {
		const prompt = buildSystemPrompt(sampleContext, 'Lutfi Zain');
		expect(prompt).toContain("Multi-Currency (Valuta Asing & Kripto)");
		expect(prompt).toContain("byCurrency");
	});

	it('embeds category breakdown guidance', () => {
		const prompt = buildSystemPrompt(sampleContext, 'Lutfi Zain');
		expect(prompt).toContain("Analisis Kategori & Pagu Anggaran (Budget)");
	});
});
