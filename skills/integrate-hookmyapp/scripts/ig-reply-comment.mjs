import { parseArgs, getFlag, requireFlag } from './lib/args.mjs';
import { instagramConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage:
      'node scripts/ig-reply-comment.mjs --comment <id> --text "thanks!"   (add --private for a DM reply instead)',
    env: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_ACCOUNT_ID', 'INSTAGRAM_GRAPH_API_URL'],
    notes: [
      'Default: public reply under the comment (POST /{comment-id}/replies).',
      '--private: send a private DM in response to the comment (one per comment, within the window).',
    ],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, igId } = instagramConfig();
    const comment = requireFlag(flags, ['comment', 'comment-id', 'comment_id'], 'comment');
    const text = requireFlag(flags, ['text'], 'text');
    const isPrivate = getFlag(flags, ['private']) !== undefined;

    let res;
    if (isPrivate) {
      const id = getFlag(flags, ['ig-id', 'ig_id']) || igId;
      if (!id) throw new Error('No IG user id: set INSTAGRAM_ACCOUNT_ID or pass --ig-id (needed for --private)');
      const body = { recipient: { comment_id: comment }, message: { text } };
      res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/messages`, body });
    } else {
      res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${comment}/replies`, body: { message: text } });
    }
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to reply to comment', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
