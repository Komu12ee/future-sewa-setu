/**
 * Parser for spoken Hindi & English numbers (e.g. age, quantities)
 */
import { parseDigits } from './digitsParser.js';

const HINDI_WORD_TO_NUMBER = {
  'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
  'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
  'इक्कीस': 21, 'बाईस': 22, 'तेईस': 23, 'चौबीस': 24, 'पच्चीस': 25,
  'छब्बीस': 26, 'सत्ताईस': 27, 'अट्ठाईस': 28, 'उनतीस': 29, 'तीस': 30,
  'इकतीस': 31, 'बत्तीस': 32, 'तैंतीस': 33, 'चौंतीस': 34, 'पैंतीस': 35,
  'छत्तीस': 36, 'सैंतीस': 37, 'अड़तीस': 38, 'उनतालीस': 39, 'चालीस': 40,
  'इकतालीस': 41, 'बयालीस': 42, 'तैंतालीस': 43, 'चवालीस': 44, 'पैंतालीस': 45,
  'छियालीस': 46, 'सैंतालीस': 47, 'अड़तालीस': 48, 'उनचास': 49, 'पचास': 50,
  'इक्यावन': 51, 'बावन': 52, 'तिरेपन': 53, 'चौवन': 54, 'पचपन': 55,
  'छप्पन': 56, 'सत्तावन': 57, 'अट्ठावन': 58, 'उनसठ': 59, 'साठ': 60,
  'इकसठ': 61, 'बासठ': 62, 'तिरसठ': 63, 'चौंसठ': 64, 'पैंसठ': 65,
  'छियासठ': 66, 'सरसठ': 67, 'अड़सठ': 68, 'उनहत्तर': 69, 'सत्तर': 70,
  'अस्सी': 80, 'नब्बे': 90, 'सौ': 100
};

export function parseNumber(transcript, min = 0, max = 999999) {
  if (!transcript) return null;

  const raw = String(transcript).trim().toLowerCase();

  // Try direct digits match first
  const matchDigits = raw.match(/\d+/);
  if (matchDigits) {
    const num = parseInt(matchDigits[0], 10);
    if (!isNaN(num) && num >= min && num <= max) return num;
  }

  // Check word dictionary
  for (const [word, num] of Object.entries(HINDI_WORD_TO_NUMBER)) {
    if (raw.includes(word)) {
      if (num >= min && num <= max) return num;
    }
  }

  // Try digit parser
  const parsedDigits = parseDigits(raw);
  if (parsedDigits) {
    const num = parseInt(parsedDigits, 10);
    if (!isNaN(num) && num >= min && num <= max) return num;
  }

  return null;
}
