import { createHash } from 'node:crypto';

export type TaskComplexity = 'standard' | 'mutation' | 'deep_audit';

export interface BudgetClassificationContext {
	route?: string;
	hasStatementSession?: boolean;
}

/**
 * Classifies the required tool iteration budget based on intent and application context.
 * - standard query / lookup: 10 steps
 * - financial mutation (plan -> mutate -> verify): 8 steps
 * - deep audit (statement reconciliation, multi-month horizon): 40 steps
 */
export function classifyStepBudget(
	prompt: string,
	context?: BudgetClassificationContext
): { budget: number; complexity: TaskComplexity } {
	const lower = (prompt || '').toLowerCase();

	if (
		context?.hasStatementSession ||
		lower.includes('rekening koran') ||
		lower.includes('statement') ||
		lower.includes('rekonsiliasi') ||
		lower.includes('audit mutasi') ||
		lower.includes('horizon multi') ||
		lower.includes('24 bulan') ||
		lower.includes('12 bulan')
	) {
		return { budget: 40, complexity: 'deep_audit' };
	}

	if (
		lower.includes('catat') ||
		lower.includes('transfer') ||
		lower.includes('tambah dompet') ||
		lower.includes('buat budget') ||
		lower.includes('bayar hutang') ||
		lower.includes('alokasi')
	) {
		return { budget: 8, complexity: 'mutation' };
	}

	return { budget: 10, complexity: 'standard' };
}

/**
 * Deterministic canonical JSON serializer that recursively sorts object keys
 * to prevent false negatives in hash-based cycle detection.
 */
export function canonicalJsonStringify(obj: unknown): string {
	if (obj === null || typeof obj !== 'object') {
		return JSON.stringify(obj);
	}
	if (Array.isArray(obj)) {
		return `[${obj.map(canonicalJsonStringify).join(',')}]`;
	}
	const record = obj as Record<string, unknown>;
	const sortedKeys = Object.keys(record).sort();
	const keyValues = sortedKeys.map(
		(k) => `${JSON.stringify(k)}:${canonicalJsonStringify(record[k])}`
	);
	return `{${keyValues.join(',')}}`;
}

export interface ToolCallSignature {
	toolName: string;
	argsHash: string;
	timestamp: number;
}

/**
 * In-flight cycle breaker that halts infinite tool loops and ping-pong tool calls.
 */
export class ToolCycleBreaker {
	private history: ToolCallSignature[] = [];
	private maxConsecutiveIdentical: number;

	constructor(options?: { maxConsecutiveIdentical?: number }) {
		this.maxConsecutiveIdentical = options?.maxConsecutiveIdentical ?? 2;
	}

	public record(toolName: string, args: unknown): { tripped: boolean; reason?: string } {
		const serializedArgs = canonicalJsonStringify(args ?? {});
		const argsHash = createHash('sha256').update(serializedArgs).digest('hex');

		this.history.push({ toolName, argsHash, timestamp: Date.now() });

		if (this.history.length >= this.maxConsecutiveIdentical) {
			const recent = this.history.slice(-this.maxConsecutiveIdentical);
			const allIdentical = recent.every(
				(item) => item.toolName === toolName && item.argsHash === argsHash
			);
			if (allIdentical) {
				return {
					tripped: true,
					reason: `Cycle breaker tripped: tool '${toolName}' invoked ${this.maxConsecutiveIdentical}x consecutively with identical arguments.`
				};
			}
		}

		return { tripped: false };
	}

	public reset(): void {
		this.history = [];
	}

	public getCallCount(): number {
		return this.history.length;
	}
}
