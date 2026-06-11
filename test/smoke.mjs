import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
const types = readFileSync(new URL('../dist/index.d.ts', import.meta.url), 'utf8');

if (!source.includes('export class UpriseUICropper')) {
  throw new Error('dist/index.js does not export UpriseUICropper');
}

if (!types.includes('export declare class UpriseUICropper')) {
  throw new Error('dist/index.d.ts does not declare UpriseUICropper');
}

console.log('Smoke test passed');
