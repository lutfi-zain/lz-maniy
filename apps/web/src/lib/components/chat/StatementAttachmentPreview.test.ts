import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import StatementAttachmentPreview from './StatementAttachmentPreview.svelte';

function file(name: string): File {
	return new File(['%PDF-1.4'], name, { type: 'application/pdf' });
}

describe('StatementAttachmentPreview queue states', () => {
	it('renders queued and parsing states with progress indicator', () => {
		const result = render(StatementAttachmentPreview, {
			props: {
				files: [
					{ file: file('bca.pdf'), status: 'queued' },
					{ file: file('mandiri.pdf'), status: 'parsing' }
				],
				onremove: () => {}
			}
		});
		expect(result.body).toContain('bca.pdf');
		expect(result.body).toContain('Menunggu antrean...');
		expect(result.body).toContain('mandiri.pdf');
		expect(result.body).toContain('Mengekstrak teks...');
	});

	it('renders ready state with page and row counts', () => {
		const result = render(StatementAttachmentPreview, {
			props: {
				files: [
					{
						file: file('bca.pdf'),
						status: 'ready',
						result: { fileName: 'bca.pdf', status: 'ready', pageCount: 12, rowCount: 87, bank: 'BCA' }
					}
				],
				onremove: () => {}
			}
		});
		expect(result.body).toContain('12 hlm');
		expect(result.body).toContain('87 baris');
		expect(result.body).toContain('BCA');
	});

	it('renders error state with reason', () => {
		const result = render(StatementAttachmentPreview, {
			props: {
				files: [
					{
						file: file('locked.pdf'),
						status: 'error',
						result: { fileName: 'locked.pdf', status: 'error', error: 'PDF diproteksi kata sandi.' }
					}
				],
				onremove: () => {}
			}
		});
		expect(result.body).toContain('locked.pdf');
		expect(result.body).toContain('PDF diproteksi kata sandi.');
	});
});
