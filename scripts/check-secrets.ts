import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

interface SecretPattern {
	family: string;
	regex: RegExp;
}

const SECRET_PATTERNS: SecretPattern[] = [
	{
		family: 'Reedrich Live API Key',
		regex: /(?:rd|fp)_live_[A-Fa-f0-9]{32}(?![A-Fa-f0-9])/g
	},
	{
		family: 'Groq API Key',
		regex: /gsk_[A-Za-z0-9_\-]{40,}/g
	},
	{
		family: 'Google GenAI / OAuth Key',
		regex: /(?:AIza[0-9A-Za-z_\-]{35}|AQ\.[A-Za-z0-9_\-]{30,})/g
	},
	{
		family: 'Private Key Block',
		regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g
	}
];

function redact(text: string): string {
	if (text.length <= 8) return '[REDACTED]';
	return `${text.slice(0, 4)}...[REDACTED]...${text.slice(-4)}`;
}

export interface ScanFinding {
	source: 'working-tree' | 'staged' | 'commit-message' | 'history-blob';
	location: string;
	family: string;
	redactedMatch: string;
	line?: number;
}

export function scanText(
	content: string,
	source: ScanFinding['source'],
	location: string
): ScanFinding[] {
	const findings: ScanFinding[] = [];
	const lines = content.split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		for (const pat of SECRET_PATTERNS) {
			pat.regex.lastIndex = 0;
			let match: RegExpExecArray | null;
			while ((match = pat.regex.exec(line)) !== null) {
				findings.push({
					source,
					location,
					family: pat.family,
					redactedMatch: redact(match[0]),
					line: i + 1
				});
			}
		}
	}
	return findings;
}

export function scanWorkingTree(cwd: string = process.cwd()): ScanFinding[] {
	const findings: ScanFinding[] = [];
	// Get tracked and staged files
	const lsResult = spawnSync('git', ['ls-files'], { cwd, encoding: 'utf-8' });
	if (lsResult.status !== 0) {
		throw new Error(`git ls-files failed: ${lsResult.stderr}`);
	}
	const files = lsResult.stdout.split('\n').filter(Boolean);

	for (const file of files) {
		// Do not scan binary or ignored paths
		try {
			const fullPath = `${cwd}/${file}`;
			if (!existsSync(fullPath)) continue;
			const content = readFileSync(fullPath, 'utf-8');
			findings.push(...scanText(content, 'working-tree', file));
		} catch {
			// Skip unreadable / binary files
		}
	}

	// Also check staged changes
	const stagedResult = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd, encoding: 'utf-8' });
	if (stagedResult.status === 0) {
		const stagedFiles = stagedResult.stdout.split('\n').filter(Boolean);
		for (const file of stagedFiles) {
			const catResult = spawnSync('git', ['show', `:${file}`], { cwd, encoding: 'utf-8' });
			if (catResult.status === 0) {
				findings.push(...scanText(catResult.stdout, 'staged', file));
			}
		}
	}

	return findings;
}

export function scanCommitMessages(cwd: string = process.cwd()): ScanFinding[] {
	const findings: ScanFinding[] = [];
	const logResult = spawnSync('git', ['log', '--format=%H%x00%B%x00', '--all'], { cwd, encoding: 'utf-8' });
	if (logResult.status !== 0) return findings;

	const entries = logResult.stdout.split('\0\0').filter(Boolean);
	for (const entry of entries) {
		const [commitHash, ...msgParts] = entry.split('\0');
		const msg = msgParts.join('\0').trim();
		findings.push(...scanText(msg, 'commit-message', `commit ${commitHash?.slice(0, 8)}`));
	}
	return findings;
}

export function scanGitHistory(cwd: string = process.cwd()): ScanFinding[] {
	const findings: ScanFinding[] = [];
	// List all reachable blobs
	const revResult = spawnSync('git', ['rev-list', '--objects', '--all'], { cwd, encoding: 'utf-8' });
	if (revResult.status !== 0) return findings;

	const objectLines = revResult.stdout.split('\n').filter(Boolean);
	const objectPaths = new Map<string, string>();
	for (const line of objectLines) {
		const [hash, ...pathParts] = line.split(' ');
		if (hash) {
			objectPaths.set(hash, pathParts.join(' ') || '<unnamed>');
		}
	}

	// Check commit messages
	findings.push(...scanCommitMessages(cwd));

	// Batch check blobs
	const catCheck = spawnSync('git', ['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
		cwd,
		input: Array.from(objectPaths.keys()).join('\n') + '\n',
		encoding: 'utf-8'
	});
	if (catCheck.status !== 0) return findings;

	const blobHashes = catCheck.stdout
		.split('\n')
		.filter((line) => line.endsWith(' blob'))
		.map((line) => line.split(' ')[0]);

	for (const hash of blobHashes) {
		const showBlob = spawnSync('git', ['cat-file', '-p', hash], { cwd, encoding: 'utf-8' });
		if (showBlob.status === 0 && showBlob.stdout) {
			const path = objectPaths.get(hash) || hash;
			findings.push(...scanText(showBlob.stdout, 'history-blob', `${path} (${hash.slice(0, 8)})`));
		}
	}

	return findings;
}

// CLI runner
if (import.meta.main) {
	const args = process.argv.slice(2);
	const checkHistory = args.includes('--history') || args.includes('--all');

	console.log('🔍 Scanning repository for exposed credentials...');
	const workingTreeFindings = scanWorkingTree();
	console.log(`✓ Scanned working tree: ${workingTreeFindings.length} finding(s)`);

	let historyFindings: ScanFinding[] = [];
	if (checkHistory) {
		console.log('🔍 Scanning full reachable git history and commit messages...');
		historyFindings = scanGitHistory();
		console.log(`✓ Scanned history: ${historyFindings.length} finding(s)`);
	}

	const allFindings = [...workingTreeFindings, ...historyFindings];

	if (allFindings.length > 0) {
		console.error('\n❌ SENSITIVE CREDENTIALS DETECTED:');
		for (const f of allFindings) {
			const lineInfo = f.line ? `:${f.line}` : '';
			console.error(`  - [${f.source}] ${f.location}${lineInfo} -> ${f.family} (${f.redactedMatch})`);
		}
		process.exit(1);
	} else {
		console.log('✅ Clean: No exposed credentials detected.');
		process.exit(0);
	}
}
