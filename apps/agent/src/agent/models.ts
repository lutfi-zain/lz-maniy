/// <reference types="@cloudflare/workers-types" />
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import type { ModelConfig } from '@maniyy/shared';
import type { Env } from '../types.js';

export const AVAILABLE_MODELS: ModelConfig[] = [
	{
		provider: 'gemini',
		model: 'gemini-3.8-flash',
		displayName: 'Gemini 3.8 Flash',
		capabilities: { vision: true, tool_calling: true }
	},
	{
		provider: 'gemini',
		model: 'gemini-3.1-pro-preview',
		displayName: 'Gemini 3.1 Pro',
		capabilities: { vision: true, tool_calling: true }
	},
	{
		provider: 'groq',
		model: 'openai/gpt-oss-120b',
		displayName: 'GPT-OSS 120B (Groq)',
		capabilities: { vision: false, tool_calling: true }
	},
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
	if (provider === 'gemini') {
		const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
		return google(model);
	}
	if (provider === 'groq') {
		const groq = createGroq({ apiKey: env.GROQ_API_KEY });
		return groq(model);
	}
	throw new Error(`Unknown provider: ${provider}`);
}
