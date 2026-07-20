import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['electron'],
  sourcemap: true,
  outdir: 'dist/main',
};

const ctx = await esbuild.context({
  ...common,
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
});

if (watch) {
  await ctx.watch();
  console.log('esbuild watching electron/…');
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
