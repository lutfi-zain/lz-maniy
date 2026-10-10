import { describe, it, expect } from 'vitest';
import {
	buildSystemPrompt,
	buildIdentitySection,
	buildTemporalSection,
	buildMemorySection,
	buildBehaviorProtocol,
	buildToolCatalog
} from '../system-prompt.js';
import type { PageContext, AgentMemory } from '@maniy/shared';

describe('System Prompt Builders', () => {
	const mockPageContext: PageContext = {
		currentRoute: '/',
		activeTab: 'all',
		drawerOpen: false,
		selectedInstitution: null,
		summary: {
			totalNetWorth: 15000000,
			totalSpendable: 5000000,
			totalLocked: 10000000,
			walletCount: 5,
			hasCashFlow: true
		}
	};

	it('builds identity section with user name', () => {
		const identity = buildIdentitySection('Lutfi Zain');
		expect(identity).toContain('Lutfi Zain');
		expect(identity).toContain('Eve');
	});

	it('builds temporal section with WIB dynamic dates', () => {
		const temporal = buildTemporalSection();
		expect(temporal.todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(temporal.section).toContain('WAKTU & KALENDER SISTEM');
	});

	it('builds memory section with memory object', () => {
		const memory: AgentMemory = {
			walletNicknames: { 'w-1': 'BCA Rekening Gaji' },
			cashflowPattern: 'Gajian masuk ke BCA, dipecah ke Jago',
			formattingPreferences: ['Jangan pakai emoji'],
			customContext: 'Ibu Yuliawati adalah Ummi'
		};
		const section = buildMemorySection(memory);
		expect(section).toContain('BCA Rekening Gaji');
		expect(section).toContain('Gajian masuk ke BCA');
		expect(section).toContain('Jangan pakai emoji');
		expect(section).toContain('Ibu Yuliawati');
	});

	it('builds behavior protocol containing 7 curiosity patterns', () => {
		const protocol = buildBehaviorProtocol();
		expect(protocol).toContain('DATA-FIRST RETRIEVAL');
		expect(protocol).toContain('VERIFY-AFTER-MUTATE');
		expect(protocol).toContain('MULTI-STEP REASONING');
		expect(protocol).toContain('PROACTIVE INSIGHT');
		expect(protocol).toContain('CONFIRMATION GATE');
		expect(protocol).toContain('PROTOKOL PENANGANAN ERROR TOOL');
		expect(protocol).toContain('EVALUASI HASIL TOOL');
	});

	it('builds tool catalog section', () => {
		const catalog = buildToolCatalog();
		expect(catalog).toContain('KATALOG LENGKAP TOOLS');
		expect(catalog).toContain('financial_summary');
		expect(catalog).toContain('list_wallets');
	});

	it('builds full system prompt without errors', () => {
		const prompt = buildSystemPrompt(mockPageContext, 'Lutfi Zain');
		expect(prompt).toContain('Lutfi Zain');
		expect(prompt).toContain('PROTOKOL PERILAKU EVE');
		expect(prompt).toContain('KATALOG LENGKAP TOOLS');
	});
});
