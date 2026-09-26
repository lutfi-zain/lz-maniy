import { describe, it, expect } from 'vitest';
import { createUICommandTools } from '../../agent/tools/ui-commands.js';

describe('UI Command Tools', () => {
	const tools = createUICommandTools();

	it('navigate_page returns correct shape', async () => {
		const result = await tools.navigate_page.execute({
			route: '/ledger',
			message: 'Membuka halaman ledger'
		}, { toolCallId: '1', messages: [] });
		expect(result).toEqual({
			type: 'ui_command',
			command: 'navigate',
			payload: { route: '/ledger' },
			message: 'Membuka halaman ledger'
		});
	});

	it('change_filter returns correct shape', async () => {
		const result = await tools.change_filter.execute({
			institution: 'BCA',
			message: 'Memfilter ke BCA'
		}, { toolCallId: '2', messages: [] });
		expect(result).toEqual({
			type: 'ui_command',
			command: 'filter',
			payload: { institution: 'BCA' },
			message: 'Memfilter ke BCA'
		});
	});

	it('change_tab returns correct shape', async () => {
		const result = await tools.change_tab.execute({
			tab: 'locked',
			message: 'Beralih ke tab terkunci'
		}, { toolCallId: '3', messages: [] });
		expect(result).toEqual({
			type: 'ui_command',
			command: 'tab',
			payload: { tab: 'locked' },
			message: 'Beralih ke tab terkunci'
		});
	});
});
