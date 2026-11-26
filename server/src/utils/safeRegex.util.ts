/**
 * Guarded evaluation of regex patterns written by tenants (chatbot keywords,
 * flow conditions, form validation). JS regexes have no timeout, so a
 * catastrophic pattern like `(a+)+$` could stall the event loop for every
 * user. We bound pattern size, reject nested quantifiers and back-references
 * (the usual exponential-backtracking shapes), and cap the input length.
 */
const MAX_PATTERN = 200;
const MAX_INPUT = 2000;
const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*[+*{?]/;
const BACKREFERENCE = /\\[1-9]/;

export const isSafePattern = (pattern: string): boolean =>
  typeof pattern === 'string' &&
  pattern.length > 0 &&
  pattern.length <= MAX_PATTERN &&
  !NESTED_QUANTIFIER.test(pattern) &&
  !BACKREFERENCE.test(pattern);

/** Test `input` against a tenant pattern; unsafe or invalid patterns never match. */
export const safeRegexTest = (pattern: string, input: string, flags = ''): boolean => {
  if (!isSafePattern(pattern)) return false;
  try {
    return new RegExp(pattern, flags).test(String(input).slice(0, MAX_INPUT));
  } catch {
    return false;
  }
};

export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
