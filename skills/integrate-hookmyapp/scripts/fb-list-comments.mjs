import { parseArgs, getFlag, requireFlag } from './lib/args.mjs';
import { facebookConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/fb-list-comments.mjs --post <page-id>_<post-id> [--limit 50]',
    env: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_GRAPH_API_URL (optional)'],
    notes: ['Post id comes from the inbound feed webhook (post_id) or a posts listing. Every comment is returned, replies included, oldest first.'],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token } = facebookConfig();
    const post = requireFlag(flags, ['post', 'post-id', 'post_id'], 'post');
    if (!/^\d+_\d+$/.test(post)) throw new Error('--post must look like <page-id>_<post-id>');
    const query = {
      fields: 'id,from,message,created_time,is_hidden,parent',
      filter: 'stream',
      limit: getFlag(flags, ['limit']),
    };

    const res = await gatewayRequest({ baseUrl, token, method: 'GET', path: `${post}/comments`, query });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to list comments', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
