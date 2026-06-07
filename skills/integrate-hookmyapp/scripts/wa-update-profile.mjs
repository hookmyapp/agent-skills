import { parseArgs, getFlag, loadJsonPayload } from './lib/args.mjs';
import { whatsappConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage:
      'node scripts/wa-update-profile.mjs --about "We ship fast" [--description ...] [--email ...]   (or --file <body.json>)',
    env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'META_GRAPH_API_URL'],
    notes: ['Builder flags: --about --description --address --email --vertical --website (max 2).'],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, phoneNumberId } = whatsappConfig();
    const id = getFlag(flags, ['phone-number-id', 'phone_number_id']) || phoneNumberId;
    if (!id) throw new Error('No phone number id: set WHATSAPP_PHONE_NUMBER_ID or pass --phone-number-id');

    let body;
    if (getFlag(flags, ['file', 'json', 'body'])) {
      body = await loadJsonPayload(flags);
    } else {
      body = { messaging_product: 'whatsapp' };
      for (const key of ['about', 'description', 'address', 'email', 'vertical']) {
        const v = getFlag(flags, [key]);
        if (v) body[key] = v;
      }
      const website = getFlag(flags, ['website']);
      if (website) body.websites = [website];
      if (Object.keys(body).length === 1) throw new Error('Pass at least one profile field, or --file <body.json>');
    }

    const res = await gatewayRequest({
      baseUrl,
      token,
      method: 'POST',
      path: `${id}/whatsapp_business_profile`,
      body,
    });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to update profile', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
