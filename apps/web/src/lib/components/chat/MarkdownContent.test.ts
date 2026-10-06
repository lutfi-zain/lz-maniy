import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import MarkdownContent from './MarkdownContent.svelte';

describe('MarkdownContent table scroll wrapper', () => {
	it('wraps rendered tables in a horizontal scroll container', () => {
		const result = render(MarkdownContent, {
			props: {
				content: '| A | B |\n|---|---|\n| 1 | 2 |'
			}
		});

		expect(result.body).toContain('table-scroll');
		expect(result.body).toContain('<table>');
	});

	it('renders narrow tables unchanged apart from the wrapper', () => {
		const result = render(MarkdownContent, {
			props: { content: '| A |\n|---|\n| 1 |' }
		});

		expect(result.body).toContain('table-scroll');
		expect(result.body).toContain('<td>1</td>');
	});

	it('leaves content without tables unwrapped', () => {
		const result = render(MarkdownContent, {
			props: { content: 'Halo **dunia**' }
		});

		expect(result.body).not.toContain('table-scroll');
		expect(result.body).toContain('<strong>dunia</strong>');
	});
});
