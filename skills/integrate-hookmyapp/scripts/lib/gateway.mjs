// Thin client for the HookMyApp gateway (https://gateway.hookmyapp.com/meta/...).
//
// This is the runtime fallback for environments where the `hookmyapp` CLI is not
// installed. It reads the credentials that `hookmyapp channels env <channel>
// --write` (or `hookmyapp sandbox env --write`) wrote into your project .env, and
// calls the gateway directly. The path after /meta is verbatim Meta Graph API —
// the gateway swaps the minted hmat_ access token for the underlying Meta token
// server-side. (You still provision the .env once via the CLI; these scripts then
// run without it.)
//
// The .env is loaded automatically: whatsappConfig()/instagramConfig() call
// loadEnv(), which reads `./.env` (override with `--dotenv <path>` or
// HOOKMYAPP_ENV_FILE) without overwriting already-exported vars.

import { loadEnv } from './env.mjs';

function pick(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

const DEFAULT_WA_BASE = 'https://gateway.hookmyapp.com/meta/v22.0';

/** Resolve WhatsApp credentials from env (real channel keys, with sandbox fallbacks). */
export function whatsappConfig() {
  loadEnv();
  const baseUrl = pick('WHATSAPP_API_URL', 'META_GRAPH_API_URL') || DEFAULT_WA_BASE;
  const token = pick('WHATSAPP_ACCESS_TOKEN');
  if (!token) {
    throw new Error(
      'Missing WHATSAPP_ACCESS_TOKEN. Run: hookmyapp channels env <channel> --write .env',
    );
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    token,
    phoneNumberId: pick('WHATSAPP_PHONE_NUMBER_ID'),
    wabaId: pick('WHATSAPP_WABA_ID'),
  };
}

/** Resolve Instagram credentials from env (real channel keys, with sandbox fallbacks). */
export function instagramConfig() {
  loadEnv();
  const baseUrl = pick('INSTAGRAM_API_URL', 'INSTAGRAM_GRAPH_API_URL');
  if (!baseUrl) {
    throw new Error(
      'Missing INSTAGRAM_API_URL / INSTAGRAM_GRAPH_API_URL. Run: hookmyapp channels env <channel> --write .env',
    );
  }
  const token = pick('INSTAGRAM_ACCESS_TOKEN');
  if (!token) {
    throw new Error(
      'Missing INSTAGRAM_ACCESS_TOKEN. Run: hookmyapp channels env <channel> --write .env',
    );
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    token,
    igId: pick('INSTAGRAM_ACCOUNT_ID', 'INSTAGRAM_USER_ID'),
  };
}

/** Issue a request to the gateway. `path` is appended verbatim after the versioned base. */
export async function gatewayRequest({ baseUrl, token, method = 'GET', path, query, body }) {
  const url = new URL(`${baseUrl}/${path.replace(/^\/+/, '')}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);

  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    payload = JSON.stringify(body);
  }

  const response = await fetch(url, { method, headers, body: payload });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let data = text;
  if (text && contentType.toLowerCase().includes('application/json')) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { ok: response.ok, status: response.status, url: url.toString(), data };
}
