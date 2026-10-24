/**
 * Parser for affirmative (yes) vs negative (no) responses
 */

const YES_PATTERNS = [
  'हाँ', 'हां', 'जी', 'जी हाँ', 'जी हां', 'ठीक है', 'सही', 'सही है', 'आगे बढ़ो',
  'yes', 'yeah', 'yep', 'correct', 'right', 'ok', 'okay', 'sure'
];

const NO_PATTERNS = [
  'नहीं', 'ना', 'नही', 'नहीं जी', 'गलत', 'बदलो', 'सुधारो', 'रुकिए',
  'no', 'nope', 'wrong', 'change', 'stop'
];

export function parseYesNo(transcript) {
  if (!transcript) return null;

  const text = String(transcript).trim().toLowerCase();

  for (const pattern of NO_PATTERNS) {
    if (text === pattern || text.startsWith(pattern) || text.includes(pattern)) {
      return false;
    }
  }

  for (const pattern of YES_PATTERNS) {
    if (text === pattern || text.startsWith(pattern) || text.includes(pattern)) {
      return true;
    }
  }

  return null;
}
