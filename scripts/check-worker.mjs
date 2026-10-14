import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
mkdirSync('.wrangler', { recursive: true });
execFileSync('node_modules/.bin/wrangler', ['types', '.wrangler/worker-configuration.d.ts'], { stdio: 'inherit' });
execFileSync('node_modules/.bin/tsc', ['-p', 'tsconfig.worker.json'], { stdio: 'inherit' });
execFileSync('node', ['--test', 'cloudflare/worker.test.mjs'], { stdio: 'inherit' });
