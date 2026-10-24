/**
 * Parser for names in Hindi/English
 * Strips filler phrases like "मेरा नाम", "है", "जी" etc.
 */
export function parseName(transcript) {
  if (!transcript || typeof transcript !== 'string') return '';

  let clean = transcript.trim();

  // Remove common Hindi filler phrases
  const fillers = [
    /^मेरा\s+नाम\s+/i,
    /^नाम\s+है\s+/i,
    /^नाम\s+/i,
    /^my\s+name\s+is\s+/i,
    /^i\s+am\s+/i,
    /\s+है$/i,
    /\s+जी$/i,
    /\s+लिखिए$/i,
    /\s+डालिए$/i,
    /\s+बोलिए$/i
  ];

  for (const filler of fillers) {
    clean = clean.replace(filler, '').trim();
  }

  // Capitalize first letters if in English
  if (/^[a-zA-Z\s]+$/.test(clean)) {
    clean = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  return clean;
}
