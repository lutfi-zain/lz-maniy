import { describe, it, expect } from 'vitest';
import {
	classifyStepBudget,
	canonicalJsonStringify,
	ToolCycleBreaker
} from '../../agent/iteration-budget.js';

describe('Adaptive High-Iteration Budgeting & Circuit Breaker', () => {
	describe('classifyStepBudget', () => {
		it('assigns 10 steps for standard general queries', () => {
			const res = classifyStepBudget('Berapa saldo kas saya sekarang?');
			expect(res.budget).toBe(10);
			expect(res.complexity).toBe('standard');
		});

		it('assigns 8 steps for transaction and mutation intents', () => {
			const res = classifyStepBudget('Catat makan siang 35k dari BCA');
			expect(res.budget).toBe(8);
			expect(res.complexity).toBe('mutation');
		});

		it('assigns 40 steps for statement import and reconciliation intents', () => {
			const res1 = classifyStepBudget('Rekonsiliasi rekening koran BCA bulan lalu');
			expect(res1.budget).toBe(40);
			expect(res1.complexity).toBe('deep_audit');

			const res2 = classifyStepBudget('Tolong periksa baris statement', { hasStatementSession: true });
			expect(res2.budget).toBe(40);
			expect(res2.complexity).toBe('deep_audit');
		});

		it('assigns 40 steps for multi-period horizon projections (12 or 24 months)', () => {
			const res = classifyStepBudget('Simulasikan proyeksi 24 bulan ke depan');
			expect(res.budget).toBe(40);
			expect(res.complexity).toBe('deep_audit');
		});
	});

	describe('canonicalJsonStringify', () => {
		it('produces identical string regardless of object key insertion order', () => {
			const objA = { z: 1, a: 2, m: { y: 3, x: 4 } };
			const objB = { a: 2, z: 1, m: { x: 4, y: 3 } };

			expect(canonicalJsonStringify(objA)).toBe(canonicalJsonStringify(objB));
			expect(canonicalJsonStringify(objA)).toBe('{"a":2,"m":{"x":4,"y":3},"z":1}');
		});

		it('handles arrays, primitives, and null correctly', () => {
			expect(canonicalJsonStringify(null)).toBe('null');
			expect(canonicalJsonStringify(42)).toBe('42');
			expect(canonicalJsonStringify('test')).toBe('"test"');
			expect(canonicalJsonStringify([3, 1, 2])).toBe('[3,1,2]');
			expect(canonicalJsonStringify([{ b: 1, a: 2 }])).toBe('[{"a":2,"b":1}]');
		});
	});

	describe('ToolCycleBreaker', () => {
		it('allows distinct tool calls without tripping', () => {
			const breaker = new ToolCycleBreaker();

			const r1 = breaker.record('get_snapshot', {});
			expect(r1.tripped).toBe(false);

			const r2 = breaker.record('list_transactions', { page: 1 });
			expect(r2.tripped).toBe(false);

			const r3 = breaker.record('list_transactions', { page: 2 });
			expect(r3.tripped).toBe(false);
		});

		it('trips when same tool is called consecutively with identical arguments', () => {
			const breaker = new ToolCycleBreaker();

			breaker.record('list_transactions', { limit: 10, page: 2 });
			const r2 = breaker.record('list_transactions', { page: 2, limit: 10 }); // key order inverted

			expect(r2.tripped).toBe(true);
			expect(r2.reason).toContain('list_transactions');
			expect(r2.reason).toContain('consecutively');
		});

		it('resets history cleanly', () => {
			const breaker = new ToolCycleBreaker();
			breaker.record('list_wallets', {});
			breaker.reset();
			expect(breaker.getCallCount()).toBe(0);
		});
	});
});
