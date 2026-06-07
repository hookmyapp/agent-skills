import { parseArgs, getFlag } from './lib/args.mjs';
import { whatsappConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/wa-list-templates.mjs [--status APPROVED] [--category UTILITY] [--limit 50]',
    env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_WABA_ID', 'META_GRAPH_API_URL'],
    notes: ['Templates are WABA-scoped (whole business account, not one number).'],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, wabaId } = whatsappConfig();
    const id = getFlag(flags, ['waba-id', 'waba_id']) || wabaId;
    if (!id) throw new Error('No WABA id: set WHATSAPP_WABA_ID or pass --waba-id');

    const query = {
      status: getFlag(flags, ['status']),
      category: getFlag(flags, ['category']),
      limit: getFlag(flags, ['limit']),
    };
    const res = await gatewayRequest({ baseUrl, token, method: 'GET', path: `${id}/message_templates`, query });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to list templates', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
