/// <reference types="@cloudflare/workers-types" />
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import type { ModelConfig, ModelProvider } from '@maniyy/shared';
import { createOpenCodeProvider } from './opencode-adapter.js';
import type { Env } from '../types.js';

export const AVAILABLE_MODELS: ModelConfig[] = [
	// Google Gemini Family
	{
		provider: 'gemini',
		model: 'gemini-3.7-flash',
		displayName: 'Gemini 3.7 Flash',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high']
	},
	{
		provider: 'gemini',
		model: 'gemini-3.6-flash',
		displayName: 'Gemini 3.6 Flash',
		capabilities: { vision: true, tool_calling: true }
	},
	{
		provider: 'gemini',
		model: 'gemini-3.5-flash',
		displayName: 'Gemini 3.5 Flash',
		capabilities: { vision: true, tool_calling: true }
	},
	{
		provider: 'gemini',
		model: 'gemini-3.1-flash-lite',
		displayName: 'Gemini 3.1 Flash Lite',
		capabilities: { vision: true, tool_calling: true }
	},
	{
		provider: 'gemini',
		model: 'gemini-3.5-flash-lite',
		displayName: 'Gemini 3.5 Flash Lite',
		capabilities: { vision: true, tool_calling: true }
	},
	{
		provider: 'gemini',
		model: 'gemini-flash-lite-latest',
		displayName: 'Gemini Flash Lite (Latest)',
		capabilities: { vision: true, tool_calling: true }
	},
	{
		provider: 'gemini',
		model: 'gemini-3.8-flash',
		displayName: 'Gemini 3.8 Flash (High Tier)',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high']
	},
	{
		provider: 'gemini',
		model: 'gemini-3.1-pro-preview',
		displayName: 'Gemini 3.1 Pro (Preview)',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high']
	},

	// Groq Family
	{
		provider: 'groq',
		model: 'openai/gpt-oss-20b',
		displayName: 'GPT-OSS 20B (Groq Fast)',
		capabilities: { vision: false, tool_calling: true }
	},
	{
		provider: 'groq',
		model: 'qwen/qwen3.8-27b',
		displayName: 'Qwen 3.8 27B (Groq)',
		capabilities: { vision: false, tool_calling: true }
	},
	{
		provider: 'groq',
		model: 'openai/gpt-oss-120b',
		displayName: 'GPT-OSS 120B (Groq Large)',
		capabilities: { vision: false, tool_calling: true }
	},

	// OpenCode Zen Family (Public Tier)
	{
		provider: 'opencode',
		model: 'muse-spark-1.3-contributor-free',
		displayName: 'Muse Spark 1.3 Free (OpenCode)',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'low', 'medium', 'high', 'xhigh']
	},
	{
		provider: 'opencode',
		model: 'deepseek-v4-flash-free',
		displayName: 'DeepSeek V4 Flash Free (OpenCode)',
		capabilities: { vision: false, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'low', 'medium', 'high']
	}
];

export function getModel(
	env: Env,
	provider: ModelProvider,
	model: string
) {
	if (provider === 'opencode') {
		const opencode = createOpenCodeProvider(env.OPENCODE_API_KEY || 'public');
		return opencode(model);
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
