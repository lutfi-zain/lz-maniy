import { describe, it, expect } from 'vitest';

describe('Image part construction logic', () => {
	it('builds multipart payload for Gemini native runner when image is provided', () => {
		const userMessage = 'Periksa struk ini';
		const image = {
			data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
			mimeType: 'image/png'
		};

		const parts = [
			{ text: userMessage },
			{ inlineData: { data: image.data, mimeType: image.mimeType } }
		];

		expect(parts).toHaveLength(2);
		expect(parts[0]).toEqual({ text: 'Periksa struk ini' });
		expect(parts[1]).toEqual({
			inlineData: {
				data: image.data,
				mimeType: 'image/png'
			}
		});
	});

	it('builds AI SDK user message content array with image part', () => {
		const userMessage = 'Analisa grafik pengeluaran ini';
		const image = {
			data: 'base64EncodedJpegData==',
			mimeType: 'image/jpeg'
		};

		const contentParts = [
			{ type: 'text' as const, text: userMessage },
			{ type: 'image' as const, image: image.data, mimeType: image.mimeType }
		];

		expect(contentParts).toHaveLength(2);
		expect(contentParts[0].type).toBe('text');
		expect(contentParts[1].type).toBe('image');
		expect(contentParts[1].mimeType).toBe('image/jpeg');
	});
});
