// A snippet may be ten megabytes. One <pre> holding all of it is laid out
// whole before anything is drawn, so the viewer draws it in blocks.
const BLOCK_LINES = 400;
const BLOCK_CHARS = 64 * 1024;

/** `text` cut at line ends into blocks of at most 400 lines. A line with no
 *  break in it (a minified file) is cut by length instead, never inside a
 *  surrogate pair. Joined, the blocks are `text` exactly. */
export function snippetBlocks(
  text: string,
  maxLines: number = BLOCK_LINES,
  maxChars: number = BLOCK_CHARS,
): string[] {
  const blocks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start;
    for (let lines = 0; lines < maxLines && end < text.length; lines += 1) {
      const next = text.indexOf("\n", end);
      end = next === -1 ? text.length : next + 1;
      if (end - start >= maxChars) break;
    }
    if (end - start > maxChars) {
      end = start + maxChars;
      const last = text.charCodeAt(end - 1);
      if (last >= 0xd800 && last <= 0xdbff && end - start > 1) end -= 1;
    }
    blocks.push(text.slice(start, end));
    start = end;
  }
  return blocks;
}
