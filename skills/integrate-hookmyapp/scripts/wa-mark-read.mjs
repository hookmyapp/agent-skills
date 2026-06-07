import { parseArgs, getFlag, requireFlag } from './lib/args.mjs';
import { whatsappConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/wa-mark-read.mjs --message-id <wamid.…>',
    env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'META_GRAPH_API_URL'],
    notes: ['The message id is the inbound wamid.… from the webhook payload.'],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, phoneNumberId } = whatsappConfig();
    const id = getFlag(flags, ['phone-number-id', 'phone_number_id']) || phoneNumberId;
    if (!id) throw new Error('No phone number id: set WHATSAPP_PHONE_NUMBER_ID or pass --phone-number-id');
    const messageId = requireFlag(flags, ['message-id', 'message_id'], 'message-id');

    const body = { messaging_product: 'whatsapp', status: 'read', message_id: messageId };
    const res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/messages`, body });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to mark read', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
