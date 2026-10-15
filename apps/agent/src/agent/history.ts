export interface HistoryMessage<TContent = unknown> {
	role: 'user' | 'assistant' | string;
	content: TContent;
}

/**
 * Sanitizes conversation history before sending it to multi-turn LLMs (such as Google Gemini).
 *
 * Invariants:
 * 1. Only 'user' and 'assistant' roles are kept for the LLM payload.
 * 2. Consecutive messages of the same role are collapsed (the latest turn of that role wins).
 * 3. When preparing prior history to which a new 'user' turn will be appended,
 *    the prior list MUST end with an 'assistant' turn (or be empty). Any dangling trailing 'user'
 *    turn from a previous uncompleted/crashed turn is pruned from the model payload so that the
 *    resulting sequence strictly alternates: user -> assistant -> user.
 * 4. Cloudflare D1 database records remain 100% untouched for user history fidelity.
 */
export function sanitizeHistoryForModel<T extends HistoryMessage>(
	history: T[],
	options?: {
		/** If true, ensures the returned array ends with an 'assistant' turn (or is empty) so a new 'user' message can be cleanly appended */
		ensureEndsWithAssistant?: boolean;
	}
): T[] {
	if (!history || history.length === 0) return [];

	const alternating: T[] = [];
	for (const msg of history) {
		if (msg.role !== 'user' && msg.role !== 'assistant') continue;

		if (alternating.length > 0 && alternating[alternating.length - 1].role === msg.role) {
			// Replace with the newer message of the same role
			alternating[alternating.length - 1] = msg;
		} else {
			alternating.push(msg);
		}
	}

	if (options?.ensureEndsWithAssistant && alternating.length > 0) {
		if (alternating[alternating.length - 1].role === 'user') {
			alternating.pop();
		}
	}

	return alternating;
}
