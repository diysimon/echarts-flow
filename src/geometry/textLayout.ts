const WIDE_CHAR_RATIO = 1;
const NARROW_CHAR_RATIO = 0.6;
const WIDE_CHAR_PATTERN = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
/** A latin word with its trailing spaces, or a single wide (CJK) character. */
const TOKEN_PATTERN = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]|[^\s\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]+\s*|\s+/g;

/**
 * Estimates text width without a canvas so layout stays deterministic
 * in tests and SSR. CJK glyphs are roughly square, latin glyphs narrower.
 */
export function calcTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    width += (WIDE_CHAR_PATTERN.test(char) ? WIDE_CHAR_RATIO : NARROW_CHAR_RATIO) * fontSize;
  }
  return width;
}

/** True when every visible character is a wide (CJK) glyph, which reads well stacked vertically. */
export function isWideText(text: string): boolean {
  const visible = Array.from(text).filter((char) => char.trim() !== '');
  return visible.length > 0 && visible.every((char) => WIDE_CHAR_PATTERN.test(char));
}

/** Splits a token wider than the line into pieces that fit, character by character. */
function splitLongToken(token: string, maxWidth: number, fontSize: number): string[] {
  const pieces: string[] = [];
  let current = '';
  for (const char of token) {
    if (current && calcTextWidth(current + char, fontSize) > maxWidth) {
      pieces.push(current);
      current = '';
    }
    current += char;
  }
  return current ? [...pieces, current] : pieces;
}

function wrapParagraph(paragraph: string, maxWidth: number, fontSize: number): string[] {
  const tokens = paragraph.match(TOKEN_PATTERN) ?? [];
  const lines: string[] = [];
  let current = '';
  tokens.forEach((token) => {
    if (calcTextWidth((current + token).trimEnd(), fontSize) <= maxWidth) {
      current += token;
      return;
    }
    if (current.trim()) {
      lines.push(current.trimEnd());
    }
    current = '';
    if (calcTextWidth(token.trimEnd(), fontSize) <= maxWidth) {
      current = token.trimStart();
      return;
    }
    const pieces = splitLongToken(token.trim(), maxWidth, fontSize);
    current = pieces.pop() ?? '';
    lines.push(...pieces);
  });
  if (current.trim() || lines.length === 0) {
    lines.push(current.trimEnd());
  }
  return lines;
}

/**
 * Breaks text into lines no wider than `maxWidth`. Latin text breaks between
 * words, CJK text between characters; explicit newlines are kept.
 */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  return text.split('\n').flatMap((paragraph) => wrapParagraph(paragraph, Math.max(maxWidth, fontSize), fontSize));
}
