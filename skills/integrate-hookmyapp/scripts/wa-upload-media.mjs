import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, getFlag, requireFlag } from './lib/args.mjs';
import { whatsappConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage: 'node scripts/wa-upload-media.mjs --file <path> --type <mime> [--filename <name>]',
    env: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'META_GRAPH_API_URL'],
    notes: ['Returns a media id for send-time message headers (e.g. {type:"image",image:{id}}).'],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, phoneNumberId } = whatsappConfig();
    const id = getFlag(flags, ['phone-number-id', 'phone_number_id']) || phoneNumberId;
    if (!id) throw new Error('No phone number id: set WHATSAPP_PHONE_NUMBER_ID or pass --phone-number-id');
    const filePath = requireFlag(flags, ['file'], 'file');
    const mimeType = requireFlag(flags, ['type', 'mime-type', 'mime_type'], 'type');
    const filename = getFlag(flags, ['filename']) || path.basename(filePath);

    const fileBuffer = await readFile(filePath);
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), filename);

    const res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/media`, body: formData });
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to upload media', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
