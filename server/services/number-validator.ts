/**
 * Flags numeric claims in generated text that do not appear in the sources
 * (candidate profile + job description). Bracketed placeholders such as
 * [X%] or [N users] are intentional gaps for the user to fill and are ignored.
 */

type Kind = "plain" | "percent" | "times";

interface NumericToken {
  text: string;
  value: number;
  kind: Kind;
}

const NUMBER = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`;
const UNIT = String.raw`%|percent\b|million\b|billion\b|thousand\b|bn\b|[kKmMbB](?![A-Za-z0-9])|[x×](?![A-Za-z0-9])`;
const TOKEN_RE = new RegExp(
  String.raw`(?<![A-Za-z0-9.,])([$€£]\s?)?(${NUMBER})(?:\s?(${UNIT}))?(\+)?`,
  "gi",
);

const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
};

function stripPlaceholders(text: string): string {
  return text.replace(/\[[^\]]*\]/g, " ");
}

function round(n: number): number {
  return Number(n.toPrecision(12));
}

export function extractNumericTokens(input: string): NumericToken[] {
  const text = stripPlaceholders(input);
  const raw: Array<NumericToken & { unit: string; start: number; end: number }> = [];

  for (const m of text.matchAll(TOKEN_RE)) {
    const unit = (m[3] ?? "").toLowerCase();
    raw.push({
      text: m[0].trim(),
      value: parseFloat(m[2].replace(/,/g, "")),
      kind: "plain",
      unit,
      start: m.index!,
      end: m.index! + m[0].length,
    });
  }

  // In ranges like "25-35%" or "5 to 10K", the unit applies to both ends.
  for (let i = raw.length - 2; i >= 0; i--) {
    const cur = raw[i];
    const next = raw[i + 1];
    if (cur.unit || !next.unit) continue;
    if (/^\s*(?:[-–—]|to)\s*$/i.test(text.slice(cur.end, next.start))) cur.unit = next.unit;
  }

  return raw.map((t) => {
    let { value, kind } = t;
    if (t.unit === "%" || t.unit === "percent") kind = "percent";
    else if (t.unit === "x" || t.unit === "×") kind = "times";
    else if (MULTIPLIERS[t.unit]) value *= MULTIPLIERS[t.unit];
    return { text: t.text, value: round(value), kind };
  });
}

class SourceNumbers {
  private plain = new Set<number>();
  private percent = new Set<number>();
  private times = new Set<number>();

  constructor(sources: string[]) {
    for (const source of sources) {
      for (const t of extractNumericTokens(source)) {
        if (t.kind === "percent") this.percent.add(t.value);
        else if (t.kind === "times") this.times.add(t.value);
        else this.plain.add(t.value);
      }
    }
  }

  has(t: NumericToken): boolean {
    if (t.kind === "percent") return this.percent.has(t.value);
    if (t.kind === "times") return this.times.has(t.value);
    // A bare number may restate any sourced figure, whatever its unit.
    return this.plain.has(t.value) || this.percent.has(t.value) || this.times.has(t.value);
  }
}

/** Returns de-duplicated numeric values in `generated` that no source supports. */
export function findUnsupportedNumbers(generated: string[], sources: string[]): string[] {
  const known = new SourceNumbers(sources);
  const unsupported = new Map<string, string>();

  for (const text of generated) {
    for (const token of extractNumericTokens(text)) {
      if (known.has(token)) continue;
      const key = `${token.kind}:${token.value}`;
      if (!unsupported.has(key)) unsupported.set(key, token.text);
    }
  }
  return [...unsupported.values()];
}
