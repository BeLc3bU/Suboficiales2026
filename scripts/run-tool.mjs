import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';

const [, , tool, ...args] = process.argv;
if (!tool) {
  console.error('Uso: node scripts/run-tool.mjs <tool> [...args]');
  process.exit(1);
}

const root = process.cwd();
const localNm = resolve(root, 'node_modules');
const fallbackNm = process.env.LOCAL_NODE_MODULES || join(homedir(), '.local-nm', 'suboficiales-2026', 'node_modules');
const nmRoot = existsSync(join(localNm, 'vite')) ? localNm : fallbackNm;

const toolEntries = {
  vite: join(nmRoot, 'vite', 'bin', 'vite.js'),
  vitest: join(nmRoot, 'vitest', 'vitest.mjs'),
  tsc: join(nmRoot, 'typescript', 'bin', 'tsc'),
};

const entry = toolEntries[tool];
if (!entry || !existsSync(entry)) {
  console.error(`No se encontró la herramienta "${tool}" en ${nmRoot}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [entry, ...args], {
  stdio: 'inherit',
  cwd: root,
  env: {
    ...process.env,
    NODE_PATH: nmRoot,
    SUBOFICIALES_NM_ROOT: nmRoot,
  },
});

process.exit(result.status ?? 1);
