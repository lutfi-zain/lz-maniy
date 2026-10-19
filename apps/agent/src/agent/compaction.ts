
export const COMPACTION_THRESHOLD_PERCENT = 0.8; // 80% of context window

/**
 * Estimate token count using words * 1.3 heuristic for text plus 2048 per image
 */
export function estimateTokens(
	messages: Array<{ role: string; content?: string | null; imageRef?: string | null }>,
	systemPrompt: string = ''
): number {
	let words = 0;
	let images = 0;

	if (systemPrompt) {
		words += systemPrompt.trim().split(/\s+/).filter(Boolean).length;
	}

	for (const msg of messages) {
		if (msg.content) {
			words += msg.content.trim().split(/\s+/).filter(Boolean).length;
		}
		if (msg.imageRef) {
			images += 1;
		}
	}

	return Math.round(words * 1.3) + images * 2048;
}

/**
 * @walkthrough 04.02:token-compaction
 * @topic Context Window Optimization
 * @ref https://roadmap.sh/ai-engineer | okf://knowledge/ai-evals-course/fase-2-taksonomi-kegagalan-dan-error-analysis.md
 * @notes Mengestimasi konsumsi token dan memicu peringkasan percakapan secara asinkron saat context window melewati batas ambang 70%.
 */
export function shouldCompact(estimatedTokens: number, contextWindow: number): boolean {
	if (!contextWindow || contextWindow <= 0) return false;
	return estimatedTokens >= contextWindow * COMPACTION_THRESHOLD_PERCENT;
}
