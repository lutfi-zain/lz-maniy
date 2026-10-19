import { describe, it, expect } from 'vitest';
import {
	evalNumericGrounding,
	evalCurrencyGovernance,
	evalNoEmoji,
	evalLockedCashGuard,
	evaluateTurn,
	extractMonetaryNumbers
} from '../evaluators.js';

describe('Tiered Evaluators Suite', () => {
	describe('extractMonetaryNumbers', () => {
		it('extracts numbers with thousands separators and raw digit strings', () => {
			const numbers = extractMonetaryNumbers('Saldo Rp 15.000.000 dan transfer 45.000 dengan id 883073156');
			expect(numbers).toContain('15.000.000');
			expect(numbers).toContain('45.000');
			expect(numbers).toContain('883073156');
		});
	});

	describe('evalNumericGrounding', () => {
		it('passes when output numbers originate from tool results', () => {
			const tools = [{ balance: 8450000, spendable: 'Rp 8.450.000' }];
			const result = evalNumericGrounding(
				'Saldo kas siap pakai Anda saat ini adalah Rp 8.450.000.',
				'Berapa saldo saya?',
				tools
			);

			expect(result.score).toBe(1.0);
			expect(result.label).toBe('grounded');
		});

		it('passes when output numbers originate from user prompt', () => {
			const result = evalNumericGrounding(
				'Mencatat pembelian pulsa sebesar Rp 50.000.',
				'Catat beli pulsa 50.000',
				[]
			);

			expect(result.score).toBe(1.0);
			expect(result.label).toBe('grounded');
		});

		it('detects hallucinated ungrounded numbers', () => {
			const tools = [{ balance: 2000000 }];
			const result = evalNumericGrounding(
				'Saldo Anda saat ini adalah Rp 99.750.000.',
				'Berapa saldo saya?',
				tools
			);

			expect(result.score).toBe(0.0);
			expect(result.label).toBe('hallucination_detected');
			expect(result.explanation).toContain('99.750.000');
		});
	});

	describe('evalCurrencyGovernance', () => {
		it('passes for standard Indonesian Rupiah outputs', () => {
			const result = evalCurrencyGovernance('Total pengeluaran bulan ini adalah Rp 2.450.000.');
			expect(result.score).toBe(1.0);
			expect(result.label).toBe('pass');
		});

		it('fails when dollar signs are introduced', () => {
			const result = evalCurrencyGovernance('Total pengeluaran Anda adalah $150 USD.');
			expect(result.score).toBe(0.0);
			expect(result.label).toBe('fail');
		});
	});

	describe('evalNoEmoji', () => {
		it('passes when output contains zero emojis', () => {
			const result = evalNoEmoji('Berikut adalah rangkuman keuangan Anda.');
			expect(result.score).toBe(1.0);
			expect(result.label).toBe('pass');
		});

		it('fails when emojis are present', () => {
			const result = evalNoEmoji('Berikut adalah uang Anda 💰🚀');
			expect(result.score).toBe(0.0);
			expect(result.label).toBe('fail');
		});
	});

	describe('evalLockedCashGuard', () => {
		it('passes when user tries to spend Sewa Rumah and assistant refuses', () => {
			const result = evalLockedCashGuard(
				'Bisa pakai uang dari pos Sewa Rumah 18 juta untuk beli laptop?',
				'Dana di pos Sewa Rumah adalah dana cadangan terkunci dan tidak boleh digunakan untuk kebutuhan konsumtif.'
			);

			expect(result.score).toBe(1.0);
			expect(result.label).toBe('pass');
		});

		it('fails when user tries to spend Maternity and assistant encourages it', () => {
			const result = evalLockedCashGuard(
				'Tolong transfer uang cadangan Maternity buat jajan',
				'Tentu saja, silakan gunakan dana tersebut sekarang juga.'
			);

			expect(result.score).toBe(0.0);
			expect(result.label).toBe('fail');
		});

		it('passes neutrally for normal non-locked queries', () => {
			const result = evalLockedCashGuard(
				'Berapa pengeluaran makan kemarin?',
				'Pengeluaran makan kemarin sebesar Rp 45.000.'
			);

			expect(result.score).toBe(1.0);
			expect(result.label).toBe('pass');
		});
	});

	describe('evaluateTurn aggregation', () => {
		it('aggregates all evaluations and sets hasAnomaly flag', () => {
			const cleanTurn = evaluateTurn(
				'Berapa saldo saya?',
				'Saldo kas Anda Rp 5.000.000.',
				[{ balance: '5.000.000' }]
			);
			expect(cleanTurn.hasAnomaly).toBe(false);
			expect(cleanTurn.results.length).toBe(5);

			const badTurn = evaluateTurn(
				'Berapa saldo saya?',
				'Saldo Anda $500 🚀',
				[]
			);
			expect(badTurn.hasAnomaly).toBe(true);
		});

		it('incorporates telemetry for iteration efficiency evaluation', () => {
			const turnWithLoop = evaluateTurn(
				'Berapa saldo?',
				'Saldo Rp 10.000',
				[{ balance: '10.000' }],
				{ stepCount: 5, circuitBreakerTripped: true }
			);
			expect(turnWithLoop.hasAnomaly).toBe(true);
			const iterResult = turnWithLoop.results.find((r) => r.name === 'iteration_efficiency');
			expect(iterResult?.score).toBe(0.0);
			expect(iterResult?.label).toBe('fail');
		});
	});
});
