export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolInvocationItem {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	state: 'call' | 'result';
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

export interface ModelConfig {
	provider: 'gemini' | 'groq';
	model: string;
	displayName: string;
	capabilities: {
		vision: boolean;
		tool_calling: boolean;
	};
}

export interface AgentSettings {
	maxSteps: number;
	defaultProvider: 'gemini' | 'groq';
	defaultModel: string;
}

export interface ChatStreamRequest {
	message: string;
	conversationId?: string;
	pageContext: PageContext;
	model?: { provider: 'gemini' | 'groq'; model: string };
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
