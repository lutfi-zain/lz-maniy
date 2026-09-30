import { describe, it, expect } from 'vitest';
import { ConcurrencyPool } from './concurrency-pool';

describe('ConcurrencyPool', () => {
	it('limits concurrent executions to maxConcurrency', async () => {
		const pool = new ConcurrencyPool(2);
		let active = 0;
		let maxActive = 0;

		const gate1 = Promise.withResolvers<void>();
		const gate2 = Promise.withResolvers<void>();
		const gate3 = Promise.withResolvers<void>();
		const gate4 = Promise.withResolvers<void>();

		const runTask = (gate: PromiseWithResolvers<void>, val: number) => {
			return pool.run(async () => {
				active++;
				maxActive = Math.max(maxActive, active);
				await gate.promise;
				active--;
				return val;
			});
		};

		const p1 = runTask(gate1, 1);
		const p2 = runTask(gate2, 2);
		const p3 = runTask(gate3, 3);
		const p4 = runTask(gate4, 4);

		expect(pool.activeCount).toBe(2);
		expect(pool.queueLength).toBe(2);
		expect(maxActive).toBe(2);

		// Resolve first task
		gate1.resolve();
		await p1;

		// Task 3 should now be active
		expect(pool.activeCount).toBe(2);
		expect(pool.queueLength).toBe(1);

		gate2.resolve();
		await p2;

		gate3.resolve();
		await p3;

		gate4.resolve();
		const results = await Promise.all([p1, p2, p3, p4]);

		expect(results).toEqual([1, 2, 3, 4]);
		expect(maxActive).toBe(2);
		expect(pool.activeCount).toBe(0);
		expect(pool.queueLength).toBe(0);
	});

	it('executes tasks in FIFO order when concurrency slot opens', async () => {
		const pool = new ConcurrencyPool(1);
		const order: number[] = [];

		const gate1 = Promise.withResolvers<void>();
		const gate2 = Promise.withResolvers<void>();

		const p1 = pool.run(async () => {
			await gate1.promise;
			order.push(1);
		});
		const p2 = pool.run(async () => {
			await gate2.promise;
			order.push(2);
		});
		const p3 = pool.run(async () => {
			order.push(3);
		});

		expect(pool.queueLength).toBe(2);

		gate1.resolve();
		await p1;

		gate2.resolve();
		await p2;
		await p3;

		expect(order).toEqual([1, 2, 3]);
	});

	it('aborts task in queue when AbortSignal triggers', async () => {
		const pool = new ConcurrencyPool(1);
		const controller = new AbortController();
		const gate1 = Promise.withResolvers<void>();

		// Fill slot 1
		const p1 = pool.run(async () => {
			await gate1.promise;
			return 'done1';
		});

		// Queue task 2 with abort signal
		const p2 = pool.run(async () => {
			return 'done2';
		}, controller.signal);

		expect(pool.queueLength).toBe(1);
		controller.abort();

		await expect(p2).rejects.toThrow('The operation was aborted');
		expect(pool.queueLength).toBe(0);

		gate1.resolve();
		const res1 = await p1;
		expect(res1).toBe('done1');
	});

	it('releases slot even when task throws', async () => {
		const pool = new ConcurrencyPool(1);

		const p1 = pool.run(async () => {
			throw new Error('Task error');
		});

		await expect(p1).rejects.toThrow('Task error');
		expect(pool.activeCount).toBe(0);

		// Next task can run
		const res = await pool.run(async () => 'recovered');
		expect(res).toBe('recovered');
	});
});
