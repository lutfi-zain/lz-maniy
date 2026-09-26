import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import type { ModelConfig } from '@maniyy/shared';
import type { Env } from '../types.js';

export const AVAILABLE_MODELS: ModelConfig[] = [
	{
		provider: 'groq',
		model: 'qwen/qwen3.8-27b',
		displayName: 'Qwen 3.8 27B (Groq)',
		capabilities: { vision: false, tool_calling: true }
	}
];

export function getModel(
	env: Env,
	provider: 'gemini' | 'groq',
	model: string
) {
	if (provider === 'groq') {
		const groq = createGroq({ apiKey: env.GROQ_API_KEY });
		return groq(model);
	}
	if (provider === 'gemini') {
		const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
		return google(model);
	}
	throw new Error(`Unknown provider: ${provider}`);
}
