/**
 * Parser for spoken Hindi & English digits to numeric string
 * E.g., "नौ चार शून्य सात नौ..." -> "94079..."
 */

const HINDI_DIGIT_MAP = {
  'शून्य': '0', 'जीरो': '0', 'zero': '0', '0': '0',
  'एक': '1', 'one': '1', '1': '1',
  'दो': '2', 'two': '2', '2': '2',
  'तीन': '3', 'three': '3', '3': '3',
  'चार': '4', 'four': '4', '4': '4',
  'पांच': '5', 'पाँच': '5', 'five': '5', '5': '5',
  'छह': '6', 'छः': '6', 'छै': '6', 'six': '6', '6': '6',
  'सात': '7', 'seven': '7', '7': '7',
  'आठ': '8', 'eight': '8', '8': '8',
  'नौ': '9', 'नव': '9', 'nine': '9', '9': '9'
};

// Common Devanagari numerals ०-९
const DEV_NUMS = ['०','१','२','३','४','५','६','७','८','९'];

export function parseDigits(transcript, expectedLength = null) {
  if (!transcript) return '';

  let text = String(transcript).trim().toLowerCase();

  // Convert Devanagari numerals
  for (let i = 0; i < DEV_NUMS.length; i++) {
    text = text.replaceAll(DEV_NUMS[i], String(i));
  }

  // Split into tokens
  const tokens = text.split(/[\s,.-]+/);
  let result = '';

  for (const token of tokens) {
    if (HINDI_DIGIT_MAP[token] !== undefined) {
      result += HINDI_DIGIT_MAP[token];
    } else {
      // Extract direct digits from token if any
      const digitsOnly = token.replace(/\D/g, '');
      if (digitsOnly) {
        result += digitsOnly;
      }
    }
  }

  if (expectedLength && result.length > expectedLength) {
    result = result.slice(0, expectedLength);
  }

  return result;
}
