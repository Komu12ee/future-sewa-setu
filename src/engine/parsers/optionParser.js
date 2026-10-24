/**
 * Option Parser - Fuzzy matches spoken text against dropdown options
 */

export function parseOption(transcript, options = []) {
  if (!transcript || !options || options.length === 0) return null;

  const text = normalize(transcript);

  // 1. Exact or startsWith match
  for (const opt of options) {
    const optVal = typeof opt === 'string' ? opt : (opt.value || opt.label || '');
    const optNorm = normalize(optVal);

    if (optNorm === text) return optVal;
    if (text.includes(optNorm) || optNorm.includes(text)) return optVal;
  }

  // 2. Levenshtein / Token similarity
  let bestMatch = null;
  let bestScore = 0;

  for (const opt of options) {
    const optVal = typeof opt === 'string' ? opt : (opt.value || opt.label || '');
    const optNorm = normalize(optVal);

    const score = calculateSimilarity(text, optNorm);
    if (score > bestScore && score > 0.4) {
      bestScore = score;
      bestMatch = optVal;
    }
  }

  return bestMatch;
}

function normalize(str) {
  return String(str)
    .toLowerCase()
    .replace(/[।.,?!/\\-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.includes(shorter)) return 0.85;

  // Simple bigram overlap
  const getBigrams = s => {
    const bg = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      bg.add(s.slice(i, i + 2));
    }
    return bg;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersection = 0;

  for (const b of bg1) {
    if (bg2.has(b)) intersection++;
  }

  return (2.0 * intersection) / (bg1.size + bg2.size || 1);
}
