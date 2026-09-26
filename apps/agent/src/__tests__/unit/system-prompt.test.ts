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
			totalNetWorth: 15284837.21,
			totalSpendable: 723792.15,
			totalLocked: 14561045.06,
			walletCount: 17,
			hasCashFlow: true
		}
	};

	it('includes persona and user name', () => {
		const prompt = buildSystemPrompt(sampleContext, 'Lutfi Zain');
		expect(prompt).toContain('Lutfi Zain');
		expect(prompt).toContain('Eve');
	});
});
