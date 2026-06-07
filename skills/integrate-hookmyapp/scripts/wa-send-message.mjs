import { parseArgs, getFlag, loadJsonPayload } from './lib/args.mjs';
import { whatsappConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage:
      'node scripts/wa-send-message.mjs --to <+E164> --text "hi"   (or: --file <body.json> | --json <inline>)',
    env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'META_GRAPH_API_URL'],
    notes: [
      'Text shortcut builds the {messaging_product,to,type:text,text} body for you.',
      'For images/interactive/etc, pass a complete Meta body via --file (see assets/).',
    ],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, phoneNumberId } = whatsappConfig();
    const id = getFlag(flags, ['phone-number-id', 'phone_number_id']) || phoneNumberId;
    if (!id) throw new Error('No phone number id: set WHATSAPP_PHONE_NUMBER_ID or pass --phone-number-id');

    const to = getFlag(flags, ['to']);
    const text = getFlag(flags, ['text']);
    let body;
    if (getFlag(flags, ['file', 'json', 'body'])) {
      body = await loadJsonPayload(flags);
    } else if (to && text) {
      body = { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text } };
    } else {
      throw new Error('Provide --to and --text, or a complete --file/--json body');
    }

    const res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/messages`, body });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to send message', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
