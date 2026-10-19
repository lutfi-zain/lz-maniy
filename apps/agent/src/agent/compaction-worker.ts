import type { Env } from '../types.js';
import type { ChatMessage } from '@maniy/shared';
import { generateText, type LanguageModelV1 } from 'ai';
import { getModel } from './models.js';
import { setConversationCompaction } from '../db/queries.js';

/**
 * Compacts conversation history when estimated tokens exceed the threshold.
 * Selects oldest messages (preserving the last 4 turns), summarizes them
 * via gemini-3.1-flash-lite, and saves the summary to D1.
 */
export async function compactConversation(
	db: D1Database,
	env: Env,
	conversationId: string,
	messages: ChatMessage[]
): Promise<string | null> {
	// Need at least 6 messages to justify compaction (keep last 4 turns)
	if (messages.length <= 6) return null;

	const preserveCount = 4; // Keep last 4 messages intact
	const messagesToCompact = messages.slice(0, messages.length - preserveCount);
	const preservedMessages = messages.slice(messages.length - preserveCount);

	const conversationText = messagesToCompact
		.map((m) => `${m.role.toUpperCase()}: ${m.content}`)
		.join('\n\n');

	try {
		const summarizerModel = getModel(env, 'omp', 'google-antigravity/gemini-3.1-flash-lite');
		const result = await generateText({
			model: summarizerModel as unknown as LanguageModelV1,
			system:
				'You are a concise financial assistant summarizer. Summarize the following past conversation history into an extractive financial ledger snapshot followed by a brief dialogue recap.\nStructure your output as:\n### Financial Snapshot\n- Latest Known Balances: [List by wallet name/ID]\n- Active Commitments / Planned Transactions: [List any upcoming commitments, target goals, or pending actions]\n- User Preferences & Directives: [List specific formatting or budgeting constraints]\n### Dialogue Summary\n[1-2 dense paragraphs of conversational context]. Preserve all exact figures (Rp X.XXX.XXX) without commentary.',
			prompt: `Past conversation:\n\n${conversationText}`
		});

		const summary = result.text.trim();
		if (!summary) return null;

		const compactedAt = preservedMessages[0]?.timestamp ?? Date.now();
		await setConversationCompaction(db, conversationId, summary, compactedAt);

		return summary;
	} catch (err) {
		console.error('Failed to compact conversation:', err);
		return null;
	}
}
