import { describe, it, expect } from 'vitest';
import {
	estimateTokens,
	shouldCompact,
	OPERATIONAL_WORKING_MEMORY_CEILING
} from '../../agent/compaction.js';
import { buildSystemPrompt } from '../../agent/system-prompt.js';

describe('Entity-Preserving Context Compaction & Working Memory', () => {
	describe('estimateTokens', () => {
		it('estimates tokens for plain text messages using chars/3.2 ratio', () => {
			const messages = [
				{ role: 'user', content: 'Berapa saldo kas siap pakai saya?' },
				{ role: 'assistant', content: 'Saldo kas siap pakai Anda adalah Rp 15.000.000.' }
			];
			const tokens = estimateTokens(messages);
			expect(tokens).toBeGreaterThan(15);
			expect(tokens).toBeLessThan(50);
		});

		it('accounts for structured toolCalls and multi-kilobyte toolResults in token estimation', () => {
			const largeToolResult = Array.from({ length: 50 }, (_, i) => ({
				transactionId: `tx-${i}`,
				date: '2026-10-15',
				amount: 50000 + i * 1000,
				walletName: 'BCA Main',
				description: `Pembelian rutin barang kantor nomor ${i}`
			}));

			const messages = [
				{
					role: 'assistant',
					content: 'Berikut riwayat mutasi Anda:',
					toolCalls: [{ toolName: 'list_transactions', args: { limit: 50 } }],
					toolResults: largeToolResult
				}
			];

			const tokens = estimateTokens(messages);
			// 50 records * ~120 chars = ~6000 chars => ~1800+ tokens
			expect(tokens).toBeGreaterThan(1500);
		});

		it('adds 2048 tokens per image attachment', () => {
			const messages = [
				{ role: 'user', content: 'Periksa struk ini', imageRef: 'ephemeral-img' }
			];
			const tokens = estimateTokens(messages);
			expect(tokens).toBeGreaterThanOrEqual(2048);
		});
	});

	describe('shouldCompact', () => {
		it('triggers when tokens reach the 20,000 working memory ceiling even with 1M context window', () => {
			expect(shouldCompact(19_999, 1_000_000)).toBe(false);
			expect(shouldCompact(20_000, 1_000_000)).toBe(true);
			expect(shouldCompact(OPERATIONAL_WORKING_MEMORY_CEILING, 1_000_000)).toBe(true);
		});

		it('triggers on legacy percentage threshold when context window is smaller', () => {
			// 80% of 10,000 = 8,000
			expect(shouldCompact(8_000, 10_000)).toBe(true);
			expect(shouldCompact(7_999, 10_000)).toBe(false);
		});
	});

	describe('Context Injection in System Prompt', () => {
		it('cleanly injects compactionSummary into buildSystemPrompt', () => {
			const mockPageContext = {
				currentRoute: '/accounts',
				activeTab: 'all' as const,
				drawerOpen: false,
				selectedInstitution: null,
				summary: { walletCount: 3, hasCashFlow: true }
			};

			const mockCompaction = '### Financial Snapshot\n- BCA: Rp 15.000.000\n- Goal: Beli Laptop Rp 20.000.000';
			const promptWithCompaction = buildSystemPrompt(
				mockPageContext,
				'Lutfi',
				undefined,
				null,
				mockCompaction
			);

			expect(promptWithCompaction).toContain('RINGKASAN SESI LAMPAU (COMPACTION):');
			expect(promptWithCompaction).toContain('BCA: Rp 15.000.000');
			expect(promptWithCompaction).toContain('Goal: Beli Laptop');
		});

		it('omits compaction section when compactionSummary is nullish', () => {
			const mockPageContext = {
				currentRoute: '/accounts',
				activeTab: 'all' as const,
				drawerOpen: false,
				selectedInstitution: null,
				summary: { walletCount: 3, hasCashFlow: true }
			};

			const promptWithout = buildSystemPrompt(mockPageContext, 'Lutfi');
			expect(promptWithout).not.toContain('RINGKASAN SESI LAMPAU (COMPACTION):');
		});
	});
});
