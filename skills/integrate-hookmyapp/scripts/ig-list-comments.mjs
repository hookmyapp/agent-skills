import { parseArgs, getFlag, requireFlag } from './lib/args.mjs';
import { instagramConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/ig-list-comments.mjs --media <ig-media-id> [--limit 50]',
    env: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_GRAPH_API_URL'],
    notes: ['Media id comes from the inbound webhook (comments field) or a media listing.'],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token } = instagramConfig();
    const media = requireFlag(flags, ['media', 'media-id', 'media_id'], 'media');
    const query = { limit: getFlag(flags, ['limit']) };

    const res = await gatewayRequest({ baseUrl, token, method: 'GET', path: `${media}/comments`, query });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to list comments', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
