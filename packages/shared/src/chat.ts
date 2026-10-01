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

export type ModelProvider = 'gemini' | 'groq' | 'opencode';
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
}

export const DEFAULT_MODELS: ModelConfig[] = [
	{
		provider: 'gemini',
		model: 'gemini-3.7-flash',
		displayName: 'Gemini 3.7 Flash',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high']
	},
	{
		provider: 'gemini',
		model: 'gemini-3.1-flash-lite',
		displayName: 'Gemini 3.1 Flash Lite',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high']
	},
	{
		provider: 'gemini',
		model: 'gemini-3.8-flash',
		displayName: 'Gemini 3.8 Flash (High Tier)',
		capabilities: { vision: true, tool_calling: true, thinking: true },
		thinkingLevels: ['off', 'minimal', 'low', 'medium', 'high']
	},
	{
		provider: 'groq',
		model: 'openai/gpt-oss-20b',
		displayName: 'GPT-OSS 20B (Groq Fast)',
		capabilities: { vision: false, tool_calling: true }
	}
];

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
