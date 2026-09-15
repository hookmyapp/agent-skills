import { parseArgs, getFlag, loadJsonPayload } from './lib/args.mjs';
import { facebookConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/fb-send-dm.mjs --to <psid> --text "hi" [--tag POST_PURCHASE_UPDATE]   (or --file <body.json>)',
    env: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID', 'FACEBOOK_GRAPH_API_URL (optional)'],
    notes: [
      'PSID is the sender id from the inbound webhook. A free-form message is allowed within 24 hours of their last message; pass --tag outside it.',
      'Body shape is {recipient:{id},message:{text}}.',
    ],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, pageId } = facebookConfig();
    const id = getFlag(flags, ['page-id', 'page_id']) || pageId;
    if (!id) throw new Error('No Page id: set FACEBOOK_PAGE_ID or pass --page-id');

    let body;
    if (getFlag(flags, ['file', 'json', 'body'])) {
      body = await loadJsonPayload(flags);
    } else {
      const to = getFlag(flags, ['to']);
      const text = getFlag(flags, ['text']);
      const tag = getFlag(flags, ['tag']);
      if (!to || !text) throw new Error('Provide --to (PSID) and --text, or a complete --file body');
      body = { recipient: { id: to }, message: { text }, ...(tag ? { messaging_type: 'MESSAGE_TAG', tag } : {}) };
    }

    const res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/messages`, body });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to send message', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
