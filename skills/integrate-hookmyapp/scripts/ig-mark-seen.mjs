import { parseArgs, getFlag, requireFlag } from './lib/args.mjs';
import { instagramConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/ig-mark-seen.mjs --to <igsid>',
    env: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_ACCOUNT_ID', 'INSTAGRAM_GRAPH_API_URL'],
    notes: ['Marks the DM thread with this sender as seen.'],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, igId } = instagramConfig();
    const id = getFlag(flags, ['ig-id', 'ig_id']) || igId;
    if (!id) throw new Error('No IG user id: set INSTAGRAM_ACCOUNT_ID or pass --ig-id');
    const to = requireFlag(flags, ['to'], 'to');

    const body = { recipient: { id: to }, sender_action: 'mark_seen' };
    const res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/messages`, body });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to mark seen', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
