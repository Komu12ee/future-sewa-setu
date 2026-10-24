/**
 * Parser for currency amounts in Hindi/English
 * E.g., "दो लाख" -> 200000, "पचास हज़ार" -> 50000, "४३५६" -> 4356
 */
import { parseDigits } from './digitsParser.js';

export function parseAmount(transcript) {
  if (!transcript) return null;

  let text = String(transcript).toLowerCase().replace(/रुपये|रूपए|rupees|rs\.?|inr/gi, '').trim();

  // If text already has digits
  const directDigits = text.match(/\d[\d,]*/);
  if (directDigits) {
    const cleanNum = parseInt(directDigits[0].replace(/,/g, ''), 10);
    // Check if combined with multiplier words like "लाख" or "हज़ार"
    if (text.includes('लाख') || text.includes('lakh')) {
      return cleanNum * 100000;
    }
    if (text.includes('हज़ार') || text.includes('हजार') || text.includes('thousand')) {
      return cleanNum * 1000;
    }
    return cleanNum;
  }

  // Devanagari digits
  const parsedDigits = parseDigits(text);
  if (parsedDigits && parsedDigits.length >= 2) {
    return parseInt(parsedDigits, 10);
  }

  // Common Hindi multipliers
  let total = 0;
  const lakhMatch = text.match(/(एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस|\d+)\s*(लाख|lakh)/);
  if (lakhMatch) {
    const val = parseHindiSmall(lakhMatch[1]);
    total += val * 100000;
  }

  const hazarMatch = text.match(/(दस|बीस|तीस|चालीस|पचास|साठ|सत्तर|अस्सी|नब्बे|\d+)\s*(हज़ार|हजार|thousand)/);
  if (hazarMatch) {
    const val = parseHindiSmall(hazarMatch[1]);
    total += val * 1000;
  }

  return total > 0 ? total : null;
}

function parseHindiSmall(word) {
  const map = {
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
    'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
    'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50,
    'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90
  };
  return map[word] || parseInt(word, 10) || 1;
}
