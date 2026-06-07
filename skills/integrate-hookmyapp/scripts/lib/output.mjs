// Uniform JSON result envelope so agents always get structured stdout, even on error.

import { ENV_HELP } from './env.mjs';

export function ok(data) {
  return { ok: true, data };
}

export function err(message, details) {
  return { ok: false, error: { message, ...(details ? { details } : {}) } };
}

/** Print a result as pretty JSON to stdout and return the process exit code. */
export function printResult(result) {
  // Centralize the .env-loading note onto every --help (usage) payload, so each
  // script's help advertises --dotenv without repeating it in 11 usage() blocks.
  if (
    result.ok &&
    result.data &&
    typeof result.data === 'object' &&
    'usage' in result.data &&
    !('env_file' in result.data)
  ) {
    result.data.env_file = ENV_HELP;
  }
  // Print to stdout (not stderr) so skill runners that only surface stdout still
  // see the error detail rather than a bare "exit status 2".
  console.log(JSON.stringify(result, null, 2));
  return result.ok ? 0 : 2;
}
