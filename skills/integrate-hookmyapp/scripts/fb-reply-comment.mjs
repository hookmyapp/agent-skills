import { parseArgs, getFlag, requireFlag } from './lib/args.mjs';
import { facebookConfig, gatewayRequest } from './lib/gateway.mjs';
import { ok, err, printResult } from './lib/output.mjs';

function usage() {
  return {
    usage:
      'node scripts/fb-reply-comment.mjs --comment <id> --text "thanks!"   (add --private for a Messenger reply instead)',
    env: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID', 'FACEBOOK_GRAPH_API_URL (optional)'],
    notes: [
      'Default: public reply under the comment (POST /{comment-id}/comments).',
      '--private: Messenger message to the commenter (one per comment, within 7 days of the comment).',
      'Comment id is {postId}_{commentId} from the webhook or the bare numeric id.',
    ],
  };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help) return printResult(ok(usage()));

  try {
    const { baseUrl, token, pageId } = facebookConfig();
    const comment = requireFlag(flags, ['comment', 'comment-id', 'comment_id'], 'comment');
    if (!/^\d+(_\d+)?$/.test(comment)) throw new Error('--comment must be <post-id>_<comment-id> or a numeric comment id');
    const text = requireFlag(flags, ['text'], 'text');
    const isPrivate = getFlag(flags, ['private']) !== undefined;

    let res;
    if (isPrivate) {
      const id = getFlag(flags, ['page-id', 'page_id']) || pageId;
      if (!id) throw new Error('No Page id: set FACEBOOK_PAGE_ID or pass --page-id (needed for --private)');
      const body = { recipient: { comment_id: comment }, message: { text } };
      res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${id}/messages`, body });
    } else {
      res = await gatewayRequest({ baseUrl, token, method: 'POST', path: `${comment}/comments`, body: { message: text } });
    }
    return printResult(res.ok ? ok(res) : err('Gateway request failed', res));
  } catch (error) {
    return printResult(err('Failed to reply to comment', { message: String(error?.message || error), ...usage() }));
  }
}

main().then((code) => process.exit(code));
