import { describe, it, expect, vi } from 'vitest';
import { createMemoryTools } from '../memory.js';

describe('createMemoryTools', () => {
	it('saves wallet nickname to memory', async () => {
		const mockRun = vi.fn().mockResolvedValue({ success: true });
		const mockFirst = vi.fn().mockResolvedValue(null);
		const mockBind = vi.fn().mockReturnValue({ run: mockRun, first: mockFirst });
		const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
		const mockDb = { prepare: mockPrepare } as unknown as D1Database;

		const tools = createMemoryTools(mockDb, 'usr-123');
		expect(tools.save_memory).toBeDefined();

		const res = await tools.save_memory.execute({
			key: 'walletNicknames',
			walletNickname: { walletId: 'w-1', nickname: 'Rekening Gaji' },
			value: ''
		}, { toolCallId: '1', messages: [] });

		expect(res.status).toBe('saved');
		expect(mockPrepare).toHaveBeenCalled();
	});
});
