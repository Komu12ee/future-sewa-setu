/**
 * Parser for free text (addresses, reasons, descriptions)
 */
export function parseText(transcript) {
  if (!transcript) return '';
  return String(transcript)
    .trim()
    .replace(/^लिखिए\s+/i, '')
    .replace(/^डालिए\s+/i, '');
}
