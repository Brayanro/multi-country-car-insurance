const MAX_PATTERN = 120;
const MAX_INPUT = 256;
const MAX_REPEAT = 24;

type Interval = readonly [number, number];
type Atom = { ranges: Interval[]; min: number; max: number };
const special = new Set([
  "[",
  "]",
  "{",
  "}",
  "(",
  ")",
  ".",
  "*",
  "+",
  "?",
  "\\",
  "^",
  "$",
  "|",
]);

function codePoint(character: string): number {
  return character.codePointAt(0)!;
}

function rangesFor(source: string): Interval[] | null {
  const symbols = [...source];
  const ranges: Interval[] = [];
  for (let i = 0; i < symbols.length; i++) {
    const start = symbols[i];
    if (special.has(start) || start === "-") return null;
    const first = codePoint(start);
    if (symbols[i + 1] === "-") {
      const end = symbols[i + 2];
      if (!end || special.has(end) || end === "-" || first > codePoint(end))
        return null;
      ranges.push([first, codePoint(end)]);
      i += 2;
    } else {
      ranges.push([first, first]);
    }
  }
  return ranges.length ? ranges : null;
}

export function compilePattern(pattern: string): Atom[] | null {
  if (!pattern || pattern.length > MAX_PATTERN) return null;
  const atoms: Atom[] = [];
  let offset = 0;
  while (offset < pattern.length) {
    let ranges: Interval[] | null;
    const character = String.fromCodePoint(pattern.codePointAt(offset)!);
    if (character === "[") {
      const end = pattern.indexOf("]", offset + 1);
      if (end < 0) return null;
      ranges = rangesFor(pattern.slice(offset + 1, end));
      offset = end + 1;
    } else {
      if (special.has(character)) return null;
      const point = codePoint(character);
      ranges = [[point, point]];
      offset += character.length;
    }
    if (!ranges) return null;
    let min = 1;
    let max = 1;
    if (pattern[offset] === "{") {
      const end = pattern.indexOf("}", offset + 1);
      if (end < 0) return null;
      const repeat = /^(\d{1,2})(?:,(\d{1,2}))?$/.exec(
        pattern.slice(offset + 1, end),
      );
      if (!repeat) return null;
      min = Number(repeat[1]);
      max = repeat[2] === undefined ? min : Number(repeat[2]);
      if (min > max || max > MAX_REPEAT) return null;
      offset = end + 1;
    }
    atoms.push({ ranges, min, max });
  }
  return atoms;
}

export function matchesPattern(pattern: string, value: string): boolean {
  if (value.length > MAX_INPUT * 2) return false;
  const points = [...value].map(codePoint);
  if (points.length > MAX_INPUT) return false;
  const atoms = compilePattern(pattern);
  if (!atoms) return false;
  let offsets = new Set([0]);
  for (const { ranges, min, max } of atoms) {
    const next = new Set<number>();
    for (const offset of offsets) {
      if (min === 0) next.add(offset);
      for (
        let count = 1;
        count <= max && offset + count <= points.length;
        count++
      ) {
        const point = points[offset + count - 1];
        if (!ranges.some(([low, high]) => low <= point && point <= high)) break;
        if (count >= min) next.add(offset + count);
      }
    }
    if (!next.size) return false;
    offsets = next;
  }
  return offsets.has(points.length);
}
