import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { minify } from 'terser';

mkdirSync('dist', { recursive: true });

execFileSync('npx', ['tsc', '-p', 'tsconfig.json', '--emitDeclarationOnly'], { stdio: 'inherit' });

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.raw.js',
  bundle: false,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: false
});

const jsInput = readFileSync('dist/index.raw.js', 'utf8');
const jsOutput = await minify(jsInput, {
  module: true,
  ecma: 2020,
  compress: true,
  mangle: true
});

if (!jsOutput.code) {
  throw new Error('Terser did not produce JS output.');
}

writeFileSync('dist/index.js', jsOutput.code);
rmSync('dist/index.raw.js', { force: true });

await build({
  entryPoints: ['src/style.css'],
  outfile: 'dist/style.css',
  bundle: false,
  loader: { '.css': 'css' },
  minify: true
});

console.log('Built minified package in dist/');
