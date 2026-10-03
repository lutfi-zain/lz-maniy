/// <reference types="@cloudflare/workers-types" />
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import type { ModelConfig, ModelProvider } from '@maniyy/shared';
import type { Env } from '../types.js';

export const AVAILABLE_MODELS: ModelConfig[] = [
	{
		provider: 'omp',
		model: 'google-antigravity/gemini-3.1-flash-lite',
		displayName: 'Gemini 3.1 Flash Lite',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'low', 'medium', 'high'],
		contextWindow: 1_000_000
	},
	{
		provider: 'omp',
		model: 'google-antigravity/gemini-3.7-flash',
		displayName: 'Gemini 3.7 Flash',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'low', 'medium', 'high'],
		contextWindow: 1_000_000
	},
	{
		provider: 'omp',
		model: 'google-antigravity/gemini-3.8-flash',
		displayName: 'Gemini 3.8 Flash (High Tier)',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'low', 'medium', 'high'],
		contextWindow: 1_000_000
	}
];

export function getModel(
	env: Env,
	provider: ModelProvider,
	model: string
) {
	if (provider === 'omp') {
		const gateway = createOpenAI({
			name: 'omp',
			baseURL: env.OMP_GATEWAY_URL || 'https://ai.membran.app/v1',
			apiKey: env.OMP_GATEWAY_KEY
		});
		return gateway(model);
	}
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
