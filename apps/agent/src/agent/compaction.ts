export const OPERATIONAL_WORKING_MEMORY_CEILING = 20_000;
export const COMPACTION_THRESHOLD_PERCENT = 0.8; // 80% of context window

/**
 * Accurately estimates token consumption across message strings,
 * structured tool calls, tool results, and multimodal attachments.
 * Uses character heuristic Math.ceil(chars / 3.2) calibrated for
 * Indonesian morphology, JSON syntax, and financial currency formatting.
 */
export function estimateTokens(
	messages: Array<{
		role: string;
		content?: unknown;
		imageRef?: string | null;
		toolCalls?: unknown;
		toolResults?: unknown;
	}>,
	systemPrompt: string = ''
): number {
	let totalChars = 0;
	let images = 0;

	if (systemPrompt) {
		totalChars += systemPrompt.length;
	}

	for (const msg of messages) {
		if (typeof msg.content === 'string') {
			totalChars += msg.content.length;
		} else if (msg.content && typeof msg.content === 'object') {
			totalChars += JSON.stringify(msg.content).length;
		}

		if (msg.toolCalls) {
			totalChars += JSON.stringify(msg.toolCalls).length;
		}
		if (msg.toolResults) {
			totalChars += JSON.stringify(msg.toolResults).length;
		}

		if (msg.imageRef) {
			images += 1;
		}
	}

	return Math.ceil(totalChars / 3.2) + images * 2048;
}

/**
 * @walkthrough 04.02:token-compaction
 * @topic Context Window Optimization
 * @ref https://roadmap.sh/ai-engineer | okf://knowledge/ai-evals-course/fase-2-taksonomi-kegagalan-dan-error-analysis.md
 * @notes Memicu peringkasan percakapan secara asinkron saat context window melewati batas ambang 20,000 token working memory atau 80% model ceiling.
 */
export function shouldCompact(estimatedTokens: number, contextWindow?: number): boolean {
	if (estimatedTokens >= OPERATIONAL_WORKING_MEMORY_CEILING) {
		return true;
	}
	if (contextWindow && contextWindow > 0 && estimatedTokens >= contextWindow * COMPACTION_THRESHOLD_PERCENT) {
		return true;
	}
	return false;
}
