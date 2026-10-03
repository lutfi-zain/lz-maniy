export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolInvocationItem {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	state: 'call' | 'result';
}

export interface AssistantVariant {
	content: string;
	toolInvocations?: ToolInvocationItem[];
	thinking?: string;
	timestamp: number;
	error?: string;
}

export interface ChatMessage {
	id: string;
	conversationId: string;
	role: MessageRole;
	content: string;
	toolInvocations?: ToolInvocationItem[];
	toolCalls?: unknown[];
	toolResults?: unknown[];
	imageRef?: string; // ephemeral ref only, never base64 in DB
	thinking?: string;
	variants?: AssistantVariant[];
	activeVariantIndex?: number;
	timestamp: number;
}

export interface ConversationMeta {
	id: string;
	title: string;
	model: string;
	provider: string;
	createdAt: number;
	updatedAt: number;
	messageCount?: number;
}

export type ModelProvider = 'gemini' | 'groq' | 'omp';
export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface ModelConfig {
	provider: ModelProvider;
	model: string;
	displayName: string;
	capabilities: {
		vision: boolean;
		tool_calling: boolean;
		thinking?: boolean;
	};
	thinkingLevels?: ThinkingLevel[];
	contextWindow?: number;
}

export const DEFAULT_MODELS: ModelConfig[] = [
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

export interface AgentMemory {
	walletNicknames?: Record<string, string>;
	cashflowPattern?: string;
	formattingPreferences?: string[];
	customContext?: string;
}

export interface AgentSettings {
	maxSteps: number;
	defaultProvider: ModelProvider;
	defaultModel: string;
}

export interface ChatStreamRequest {
	message: string;
	conversationId?: string;
	pageContext: PageContext;
	model?: { provider: ModelProvider; model: string };
	thinkingLevel?: ThinkingLevel;
	image?: { data: string; mimeType: string };
}
export interface PageContext {
	currentRoute: string;
	activeTab: 'all' | 'spendable' | 'locked';
	selectedInstitution: string | null;
	drawerOpen: boolean;
	drawerType?: string;
	summary: {
		totalNetWorth?: number;
		totalSpendable?: number;
		totalLocked?: number;
		walletCount: number;
		hasCashFlow: boolean;
	};
}

export interface ExportedConversation extends ConversationMeta {
	messages: ChatMessage[];
}

export interface ImportResult {
	imported: number;
	skipped: number;
}

export interface CreditBalance {
	balance: number;
	lifetimeUsed: number;
	defaultBalance: number;
	creditValueUsd: number;
}

export interface CreditTransaction {
	id: string;
	userId: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	creditsUsed: number;
	conversationId?: string;
	createdAt: number;
}

export interface CreditPricing {
	model: string;
	inputPerMillion: number;
	outputPerMillion: number;
}

export interface ContextUsage {
	usedTokens: number;
	maxTokens: number;
	percentUsed: number;
}

export interface StreamFinishMetadata {
	creditsUsed?: number;
	creditsRemaining?: number;
	contextUsage?: ContextUsage;
}
