import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../agent/system-prompt.js';
import type { PageContext } from '@maniyy/shared';

describe('buildSystemPrompt', () => {
	const sampleContext: PageContext = {
		currentRoute: '/ledger',
		activeTab: 'spendable',
		selectedInstitution: 'BCA',
		drawerOpen: false,
		summary: {
			totalNetWorth: 17050000,
			totalSpendable: 7050000,
			totalLocked: 10000000,
			walletCount: 4,
			hasCashFlow: true
		}
	};

	it('includes persona, user name, and page context', () => {
		const prompt = buildSystemPrompt(sampleContext, 'Lutfi Zain');
		expect(prompt).toContain('Lutfi Zain');
		expect(prompt).toContain('/ledger');
		expect(prompt).toContain('spendable');
		expect(prompt).toContain('Rp 17.050.000');
		expect(prompt).toContain('Rp 7.050.000');
	});
});
