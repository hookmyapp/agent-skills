import { parseArgs, getFlag, loadJsonPayload } from './lib/args.mjs';
import { instagramConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/ig-send-dm.mjs --to <igsid> --text "hi"   (or --file <body.json>)',
    env: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_USER_ID', 'INSTAGRAM_GRAPH_API_URL'],
    notes: [
      'IGSID is the sender id from the inbound webhook — you can only DM someone who messaged you first.',
      'Body shape is {recipient:{id},message:{text}} (not WhatsApp messaging_product).',
    ],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, igId } = instagramConfig();
    const id = getFlag(flags, ['ig-id', 'ig_id']) || igId;
    if (!id) throw new Error('No IG user id: set INSTAGRAM_USER_ID or pass --ig-id');

    let body;
    if (getFlag(flags, ['file', 'json', 'body'])) {
      body = await loadJsonPayload(flags);
    } else {
      const to = getFlag(flags, ['to']);
      const text = getFlag(flags, ['text']);
      if (!to || !text) throw new Error('Provide --to (IGSID) and --text, or a complete --file body');
      body = { recipient: { id: to }, message: { text } };
    }

    const res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/messages`, body });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to send DM', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
