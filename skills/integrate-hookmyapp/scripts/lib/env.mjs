import { readFileSync, existsSync } from 'node:fs';

/** One-line description of the .env-loading behavior, surfaced in every `--help`. */
export const ENV_HELP =
  'Auto-loads ./.env (the file `hookmyapp channels env --write` produced); override with --dotenv <path> or HOOKMYAPP_ENV_FILE. Already-exported env vars win.';

let loaded = false;

function resolveEnvFile() {
  // NOTE: the flag is `--dotenv`, NOT `--env-file` — Node has its own native
  // `--env-file` that intercepts the flag (even after the script path) and hard-
  // fails on a missing file before our code runs. `--dotenv` avoids that clash.
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dotenv') return { path: argv[i + 1], explicit: true };
    if (argv[i].startsWith('--dotenv=')) return { path: argv[i].slice('--dotenv='.length), explicit: true };
  }
  if (process.env.HOOKMYAPP_ENV_FILE) return { path: process.env.HOOKMYAPP_ENV_FILE, explicit: true };
  return { path: '.env', explicit: false };
}

function parseEnv(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

/**
 * Load KEY=VALUE pairs from a .env file into process.env, without overwriting
 * variables that are already set (a real exported env always wins). Resolution:
 *   1. `--dotenv <path>` (or `--dotenv=<path>`) on the command line
 *   2. `HOOKMYAPP_ENV_FILE` env var
 *   3. `./.env` (default)
 * An explicit (1/2) file that doesn't exist throws; a missing default `./.env`
 * is a silent no-op (the env may already be exported). Idempotent.
 */
export function loadEnv() {
  if (loaded) return;
  loaded = true;
  const { path, explicit } = resolveEnvFile();
  if (!path || !existsSync(path)) {
    if (explicit) throw new Error(`env file not found: ${path}`);
    return;
  }
  for (const [k, v] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
