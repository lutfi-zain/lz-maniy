import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AGENT_ROOT = path.resolve(__dirname, '../../..');

describe('Walkthrough Curriculum Integrity & Bidirectional Parity', () => {
	const walkthroughMdPath = path.join(AGENT_ROOT, 'WALKTHROUGH.md');

	it('WALKTHROUGH.md must exist and contain the master curriculum table', () => {
		expect(fs.existsSync(walkthroughMdPath)).toBe(true);
		const content = fs.readFileSync(walkthroughMdPath, 'utf8');
		expect(content).toContain('## 2. Master Curriculum Table (6 Stages)');
		expect(content).toContain('@walkthrough');
	});

	// Parse tags declared in WALKTHROUGH.md
	function parseWalkthroughIndex(): Map<string, { topic: string; files: string[]; ref: string }> {
		const content = fs.readFileSync(walkthroughMdPath, 'utf8');
		const lines = content.split('\n');
		const indexedTags = new Map<string, { topic: string; files: string[]; ref: string }>();

		for (const line of lines) {
			const match = /\|\s*\*\*`(\d{2}\.\d{2}:[a-z0-9-]+)`\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/.exec(line);
			if (match) {
				const [, tag, topic, filesStr, , ref] = match;
				const cleanFiles = filesStr
					.split(',')
					.map((f) => f.replace(/[`*]/g, '').trim())
					.filter(Boolean);
				indexedTags.set(tag.trim(), {
					topic: topic.trim(),
					files: cleanFiles,
					ref: ref.trim()
				});
			}
		}
		return indexedTags;
	}

	// Recursively collect candidate files to scan
	function collectCodebaseFiles(dir: string, fileList: string[] = []): string[] {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.name === 'node_modules' || entry.name === '.wrangler' || entry.name === '.git') {
				continue;
			}
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				collectCodebaseFiles(fullPath, fileList);
			} else if (
				entry.name.endsWith('.ts') ||
				entry.name.endsWith('.js') ||
				entry.name.endsWith('.toml') ||
				entry.name.endsWith('.yaml') ||
				entry.name.endsWith('.yml') ||
				entry.name.endsWith('.sql')
			) {
				fileList.push(fullPath);
			}
		}
		return fileList;
	}

	it('all tags in WALKTHROUGH.md must conform to canonical regex ^\\d{2}\\.\\d{2}:[a-z0-9-]+$', () => {
		const index = parseWalkthroughIndex();
		expect(index.size).toBeGreaterThanOrEqual(18);

		const TAG_REGEX = /^\d{2}\.\d{2}:[a-z0-9-]+$/;
		for (const tag of index.keys()) {
			expect(tag).toMatch(TAG_REGEX);
		}
	});

	it('asserts bidirectional parity between WALKTHROUGH.md and codebase annotations', () => {
		const index = parseWalkthroughIndex();
		const files = collectCodebaseFiles(AGENT_ROOT);

		interface CodeTagOccurrence {
			tag: string;
			file: string;
			topic?: string;
			ref?: string;
			notes?: string;
		}

		const codeTags: CodeTagOccurrence[] = [];

		const TAG_SCANNER = /(?:\/\*\*[\s\S]*?\*\/|^(?:[ \t]*#[^\n]*\n?)+|^(?:[ \t]*--[^\n]*\n?)+)/gm;

		for (const filePath of files) {
			// Skip this test file itself to avoid false positives
			if (filePath.includes('walkthrough-integrity.test.ts')) continue;

			const content = fs.readFileSync(filePath, 'utf8');
			const relPath = path.relative(AGENT_ROOT, filePath);

			const blocks = content.match(TAG_SCANNER) || [];
			for (const block of blocks) {
				const tagMatch = /@walkthrough\s+(\d{2}\.\d{2}:[a-z0-9-]+)/.exec(block);
				if (tagMatch) {
					const topicMatch = /@topic\s+([^\n*#]+)/.exec(block);
					const refMatch = /@ref\s+([^\n*#]+)/.exec(block);
					const notesMatch = /@notes\s+([^\n*#]+)/.exec(block);

					codeTags.push({
						tag: tagMatch[1].trim(),
						file: relPath,
						topic: topicMatch ? topicMatch[1].trim() : undefined,
						ref: refMatch ? refMatch[1].trim() : undefined,
						notes: notesMatch ? notesMatch[1].trim() : undefined
					});
				}
			}
		}

		const uniqueCodeTags = new Set(codeTags.map((c) => c.tag));

		// 1. Every tag found in code must be registered in WALKTHROUGH.md (No orphan/typo tags)
		for (const foundTag of uniqueCodeTags) {
			expect(
				index.has(foundTag),
				`Tag found in code '${foundTag}' must be registered in WALKTHROUGH.md`
			).toBe(true);
		}

		// 2. Every tag registered in WALKTHROUGH.md (except self-referencing 06.01) must exist in code
		for (const [indexedTag, meta] of index.entries()) {
			if (indexedTag === '06.01:scaffold-new-agent') continue;

			expect(
				uniqueCodeTags.has(indexedTag),
				`Tag '${indexedTag}' registered in WALKTHROUGH.md must exist in codebase`
			).toBe(true);

			// Verify that the file where the tag exists matches one of the declared files
			const occurrences = codeTags.filter((c) => c.tag === indexedTag);
			expect(occurrences.length).toBeGreaterThanOrEqual(1);

			const matchingFile = occurrences.some((occ) =>
				meta.files.some((expectedFile) => occ.file.endsWith(expectedFile) || expectedFile.endsWith(occ.file))
			);
			expect(
				matchingFile,
				`Tag '${indexedTag}' was expected in [${meta.files.join(', ')}] but found in [${occurrences.map((o) => o.file).join(', ')}]`
			).toBe(true);
		}

		// 3. Every tag block must have non-empty @topic, @ref, and @notes
		for (const occurrence of codeTags) {
			expect(occurrence.topic, `Missing @topic in ${occurrence.file} for ${occurrence.tag}`).toBeDefined();
			expect(occurrence.ref, `Missing @ref in ${occurrence.file} for ${occurrence.tag}`).toBeDefined();
			expect(occurrence.notes, `Missing @notes in ${occurrence.file} for ${occurrence.tag}`).toBeDefined();
		}
	});
});
