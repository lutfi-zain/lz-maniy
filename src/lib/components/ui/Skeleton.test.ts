import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import Skeleton from './Skeleton.svelte';

describe('Skeleton Primitive Component', () => {
	it('renders with role="status" and default aria-label', () => {
		const result = render(Skeleton);
		expect(result.body).toContain('role="status"');
		expect(result.body).toContain('aria-label="Memuat..."');
		expect(result.body).toContain('animate-pulse');
		expect(result.body).toContain('bg-[#EFEFED]');
	});

	it('merges custom class names properly with default classes', () => {
		const result = render(Skeleton, {
			props: { class: 'h-6 w-32 rounded-lg' }
		});
		expect(result.body).toContain('h-6');
		expect(result.body).toContain('w-32');
		expect(result.body).toContain('rounded-lg');
		expect(result.body).toContain('animate-pulse');
	});
});
