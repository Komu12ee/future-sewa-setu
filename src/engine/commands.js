/**
 * Global Voice Commands Evaluator
 * Checked before field-level parsing
 */

export const COMMANDS = {
  REPEAT: 'REPEAT',
  BACK: 'BACK',
  CHANGE: 'CHANGE',
  PAUSE: 'PAUSE',
  RESTART: 'RESTART',
  CANCEL: 'CANCEL'
};

const COMMAND_PATTERNS = [
  { type: COMMANDS.REPEAT, keywords: ['दोहराओ', 'फिर से बोलो', 'फिर से बताओ', 'repeat', 'again', 'एक बार और'] },
  { type: COMMANDS.BACK, keywords: ['वापस', 'पीछे', 'back', 'previous', 'पिछला'] },
  { type: COMMANDS.PAUSE, keywords: ['रुको', 'रुकिए', 'pause', 'wait', 'एक मिनट'] },
  { type: COMMANDS.RESTART, keywords: ['शुरू से', 'फिर से शुरू', 'restart', 'start over'] },
  { type: COMMANDS.CANCEL, keywords: ['रद्द करो', 'कैंसिल', 'cancel', 'मेनू पर जाओ', 'menu'] },
  { type: COMMANDS.CHANGE, keywords: ['बदलो', 'सुधारो', 'change', 'edit', 'बदलना है'] }
];

export function checkGlobalCommand(transcript) {
  if (!transcript) return null;

  const text = String(transcript).trim().toLowerCase();

  for (const cmd of COMMAND_PATTERNS) {
    for (const kw of cmd.keywords) {
      if (text === kw || text.startsWith(kw) || text.includes(kw)) {
        return {
          command: cmd.type,
          matchedKeyword: kw,
          remainder: text.replace(kw, '').trim()
        };
      }
    }
  }

  return null;
}
