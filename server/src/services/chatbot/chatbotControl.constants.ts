/**
 * chatbotControl.constants.ts
 *
 * Vocabulary constants used by the bot control command detector in
 * chatbotTrigger.service.ts.
 *
 * Keeping them here makes it easy to extend the vocabulary without touching
 * the detection logic.
 */

// ── STOP / DEACTIVATE vocabulary ─────────────────────────────────────────────

/**
 * Verbs that unambiguously mean "turn the bot OFF".
 * A message must contain one of these (un-negated) + a BOT_SINGLE/BOT_MULTI
 * target to trigger deactivation.
 */
export const STOP_VERBS = new Set([
  'stop',
  'terminate',
  'deactivate',
  'disable',
  'end',
  'quit',
  'kill',
  'pause',
  'halt',
  'mute',
  'silence',
  'cancel',
  'close',
  'shut',
]);

// ── START / ACTIVATE vocabulary ───────────────────────────────────────────────

/**
 * Verbs that unambiguously mean "turn the bot ON".
 * A message must contain one of these (un-negated) + a BOT_SINGLE/BOT_MULTI
 * target to trigger activation.
 */
export const START_VERBS = new Set([
  'start',
  'activate',
  'enable',
  'resume',
  'restart',
  'reactivate',
  'wake',
  'begin',
  'launch',
  'unmute',
  'restore',
  'run',
]);

// ── Bot target vocabulary ─────────────────────────────────────────────────────

/**
 * Single-word bot identifiers matched as whole tokens.
 * e.g. "stop bot", "activate chatbot", "pause assistant"
 */
export const BOT_SINGLE = new Set([
  'bot',
  'chatbot',
  'assistant',
  'cinenexus',
]);

/**
 * Multi-word bot identifiers matched as substrings of the normalised text.
 * e.g. "stop chat bot", "start cine nexus"
 */
export const BOT_MULTI: string[] = [
  'chat bot',
  'cine nexus',
];

// ── Negation vocabulary ───────────────────────────────────────────────────────

/**
 * Words that, when appearing within 2 tokens BEFORE a STOP or START verb,
 * cause that verb to be treated as negated (i.e. the command does NOT fire).
 *
 * e.g. "don't stop bot"  → stop is negated → no deactivation
 *      "never start chatbot" → start is negated → no activation
 *
 * Note: "please" is intentionally excluded here — it does NOT negate intent.
 */
export const NEGATION_WORDS = new Set([
  'not',
  'dont',
  'never',
  'no',
  'neither',
  'nor',
  'without',
  'cannot',
  'cant',
  'wont',
  'shouldnt',
  'wouldnt',
  'couldnt',
]);
