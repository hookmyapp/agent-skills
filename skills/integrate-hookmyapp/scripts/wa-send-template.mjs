import { parseArgs, getFlag, loadJsonPayload } from './lib/args.mjs';
import { whatsappConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/wa-send-template.mjs --file <send-body.json>   (template send-time payload)',
    env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'META_GRAPH_API_URL'],
    notes: [
      'Body must be a complete Meta template message (type:"template").',
      'Start from assets/wa-send-template.json and edit name/to/language/components.',
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

    const body = await loadJsonPayload(flags);
    if (body && body.messaging_product === undefined) body.messaging_product = 'whatsapp';
    if (body.type !== 'template') throw new Error('Body type must be "template"');

    const res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/messages`, body });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to send template', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
