import { readFile } from 'node:fs/promises';

/** Minimal `--flag value` / `--flag=value` / positional parser. No deps. */
export function parseArgs(argv) {
  const flags = {};
  const positionals = [];
  const errors = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith('--')) {
      positionals.push(value);
      continue;
    }

    const key = value.slice(2);
    if (!key) {
      errors.push('Invalid flag');
      continue;
    }

    if (key === 'help' || key === 'h') {
      flags.help = 'true';
      continue;
    }

    if (key.includes('=')) {
      const [flag, ...rest] = key.split('=');
      flags[flag] = rest.join('=');
      continue;
    }

    const nextValue = argv[index + 1];
    // A bare boolean flag (e.g. --unhide) is allowed: no value, or next token is another flag.
    if (!nextValue || nextValue.startsWith('--')) {
      flags[key] = 'true';
      continue;
    }

    flags[key] = nextValue;
    index += 1;
  }

  return { flags, positionals, errors };
}

export function getFlag(flags, names) {
  for (const name of names) {
    if (flags[name] !== undefined) return flags[name];
  }
  return undefined;
}

export function requireFlag(flags, names, label) {
  const value = getFlag(flags, names);
  if (value === undefined) {
    throw new Error(`Missing required flag: --${label}`);
  }
  return value;
}

/** Load a JSON body from --json '<inline>' or --file <path>. Exactly one required. */
export async function loadJsonPayload(flags) {
  const jsonValue = getFlag(flags, ['json', 'body', 'payload']);
  const fileValue = getFlag(flags, ['file']);

  if (jsonValue && fileValue) {
    throw new Error('Provide either --json/--body or --file, not both');
  }
  if (jsonValue) {
    return JSON.parse(jsonValue);
  }
  if (fileValue) {
    return JSON.parse(await readFile(fileValue, 'utf8'));
  }
  throw new Error('Missing JSON body: pass --file <path> or --json <inline>');
}
