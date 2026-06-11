import { copyFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

mkdirSync('dist', { recursive: true });
execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' });
copyFileSync('src/style.css', 'dist/style.css');

console.log('Built TypeScript package to dist/');
