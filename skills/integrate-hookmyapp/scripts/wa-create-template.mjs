import { parseArgs, getFlag, loadJsonPayload } from './lib/args.mjs';
import { whatsappConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/wa-create-template.mjs --file <template.json>',
    env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_WABA_ID', 'META_GRAPH_API_URL'],
    notes: [
      'Body is a complete Meta create-template payload. Start from assets/wa-template-utility.json.',
      'Use parameter_format:"NAMED" with {{param_name}}; use "language" (not "language_code").',
    ],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, wabaId } = whatsappConfig();
    const id = getFlag(flags, ['waba-id', 'waba_id']) || wabaId;
    if (!id) throw new Error('No WABA id: set WHATSAPP_WABA_ID or pass --waba-id');

    const body = await loadJsonPayload(flags);
    const res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/message_templates`, body });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to create template', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
