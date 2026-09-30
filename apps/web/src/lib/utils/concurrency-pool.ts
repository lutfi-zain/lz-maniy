export class ConcurrencyPool {
	readonly maxConcurrency: number;
	#activeCount = 0;
	#queue: Array<() => void> = [];

	constructor(maxConcurrency = 10) {
		this.maxConcurrency = Math.max(1, maxConcurrency);
	}

	get activeCount(): number {
		return this.#activeCount;
	}

	get queueLength(): number {
		return this.#queue.length;
	}

	async run<T>(task: (signal?: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
		if (signal?.aborted) {
			throw new DOMException('The operation was aborted', 'AbortError');
		}

		if (this.#activeCount >= this.maxConcurrency) {
			const { promise, resolve, reject } = Promise.withResolvers<void>();

			const onAbort = () => {
				const idx = this.#queue.indexOf(resume);
				if (idx !== -1) {
					this.#queue.splice(idx, 1);
				}
				signal?.removeEventListener('abort', onAbort);
				reject(new DOMException('The operation was aborted', 'AbortError'));
			};

			const resume = () => {
				signal?.removeEventListener('abort', onAbort);
				resolve();
			};

			signal?.addEventListener('abort', onAbort);
			this.#queue.push(resume);

			await promise;
		}

		if (signal?.aborted) {
			throw new DOMException('The operation was aborted', 'AbortError');
		}

		this.#activeCount++;
		try {
			return await task(signal);
		} finally {
			this.#activeCount--;
			if (this.#queue.length > 0) {
				const next = this.#queue.shift();
				next?.();
			}
		}
	}

	clear(): void {
		this.#queue = [];
	}
}

export const globalConcurrencyPool = new ConcurrencyPool(10);
