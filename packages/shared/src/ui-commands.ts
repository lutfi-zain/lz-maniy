export type UICommandType =
	| 'navigate'
	| 'filter'
	| 'tab'
	| 'date_range'
	| 'drawer'
	| 'transaction_form'
	| 'focus';

export interface UICommandNavigate {
	type: 'ui_command';
	command: 'navigate';
	payload: { route: string };
	message: string;
}

export interface UICommandFilter {
	type: 'ui_command';
	command: 'filter';
	payload: { institution: string | null };
	message: string;
}

export interface UICommandTab {
	type: 'ui_command';
	command: 'tab';
	payload: { tab: 'all' | 'spendable' | 'locked' };
	message: string;
}

export interface UICommandDateRange {
	type: 'ui_command';
	command: 'date_range';
	payload: { start: string; end: string };
	message: string;
}

export interface UICommandDrawer {
	type: 'ui_command';
	command: 'drawer';
	payload: {
		type: string;
		title: string;
		subtitle: string;
		badge: string;
		data: Record<string, unknown>;
	};
	message: string;
}

export interface UICommandTransactionForm {
	type: 'ui_command';
	command: 'transaction_form';
	payload: Record<string, never>;
	message: string;
}

export interface UICommandFocus {
	type: 'ui_command';
	command: 'focus';
	payload: { selector: string };
	message: string;
}

export type UICommand =
	| UICommandNavigate
	| UICommandFilter
	| UICommandTab
	| UICommandDateRange
	| UICommandDrawer
	| UICommandTransactionForm
	| UICommandFocus;
