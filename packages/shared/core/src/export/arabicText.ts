/**
 * Arabic letter forms and bidirectional order, for a writer that has no
 * text engine underneath it.
 *
 * A browser is given `مرحبا` and does two things before a pixel is drawn:
 * it picks a different shape for each letter depending on its neighbours,
 * and it lays the letters out right to left. A PDF content stream does
 * neither. It draws the glyphs it is handed, left to right, in the order
 * they arrive — so the file has to arrive already shaped and already
 * reversed, or the word comes out as disconnected letters running the
 * wrong way.
 *
 * Two dependency-free pieces do that here.
 *
 * **Forms** come from the Unicode presentation-forms blocks. Every Arabic
 * letter has up to four shapes — isolated, final, initial, medial — and
 * they exist as their own code points precisely because systems without a
 * shaping engine needed somewhere to put them. Choosing between them is a
 * look at the two neighbours: whether the letter before can join forward
 * and the letter after can join back. Marks are transparent to that
 * question, which is why they travel attached to their base here rather
 * than as characters of their own.
 *
 * **Order** is the Unicode bidirectional algorithm's reordering rule, and
 * only that rule. Characters get a level — right-to-left runs one above
 * left-to-right, numbers one above the run they sit in — neutral
 * characters take the direction they are surrounded by, and then each run
 * is reversed from the deepest level outward. That is enough for a table
 * cell: an Arabic sentence, a Latin product name inside it, a date, a
 * price. It is not a full implementation — no explicit embedding controls,
 * no isolates — and it does not try to be.
 *
 * What is deliberately absent is OpenType shaping. Real Arabic
 * typography wants GSUB: contextual alternates, stacked ligatures, the
 * mark positioning a font's own tables describe. That is a shaping engine,
 * and importing one to print a table is the wrong trade. The presentation
 * forms give correct, readable, connected Arabic; a font whose design
 * needs GSUB to look right will look plain here, not wrong.
 *
 * The logical string is never lost. It travels in `/ActualText` and in
 * the font's `/ToUnicode` map, so copy-paste and a screen reader read the
 * sentence the way it was written, whatever order it was drawn in.
 */

/**
 * Letter shapes, keyed by the letter.
 *
 * The entry's length is also its joining class, because the two are the
 * same fact: a letter with only an isolated form joins nothing, one with
 * a final form joins to the right, and one with all four joins on both
 * sides.
 */
type FormSet =
  | readonly [isolated: number]
  | readonly [isolated: number, final: number]
  | readonly [isolated: number, final: number, initial: number, medial: number];

const ARABIC_FORMS = new Map<number, FormSet>([
  [0x0621, [0xfe80]], // hamza
  [0x0622, [0xfe81, 0xfe82]], // alef with madda
  [0x0623, [0xfe83, 0xfe84]], // alef with hamza above
  [0x0624, [0xfe85, 0xfe86]], // waw with hamza
  [0x0625, [0xfe87, 0xfe88]], // alef with hamza below
  [0x0626, [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c]], // yeh with hamza
  [0x0627, [0xfe8d, 0xfe8e]], // alef
  [0x0628, [0xfe8f, 0xfe90, 0xfe91, 0xfe92]], // beh
  [0x0629, [0xfe93, 0xfe94]], // teh marbuta
  [0x062a, [0xfe95, 0xfe96, 0xfe97, 0xfe98]], // teh
  [0x062b, [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c]], // theh
  [0x062c, [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0]], // jeem
  [0x062d, [0xfea1, 0xfea2, 0xfea3, 0xfea4]], // hah
  [0x062e, [0xfea5, 0xfea6, 0xfea7, 0xfea8]], // khah
  [0x062f, [0xfea9, 0xfeaa]], // dal
  [0x0630, [0xfeab, 0xfeac]], // thal
  [0x0631, [0xfead, 0xfeae]], // reh
  [0x0632, [0xfeaf, 0xfeb0]], // zain
  [0x0633, [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4]], // seen
  [0x0634, [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8]], // sheen
  [0x0635, [0xfeb9, 0xfeba, 0xfebb, 0xfebc]], // sad
  [0x0636, [0xfebd, 0xfebe, 0xfebf, 0xfec0]], // dad
  [0x0637, [0xfec1, 0xfec2, 0xfec3, 0xfec4]], // tah
  [0x0638, [0xfec5, 0xfec6, 0xfec7, 0xfec8]], // zah
  [0x0639, [0xfec9, 0xfeca, 0xfecb, 0xfecc]], // ain
  [0x063a, [0xfecd, 0xfece, 0xfecf, 0xfed0]], // ghain
  [0x0640, [0x0640, 0x0640, 0x0640, 0x0640]], // tatweel joins, unchanged
  [0x0641, [0xfed1, 0xfed2, 0xfed3, 0xfed4]], // feh
  [0x0642, [0xfed5, 0xfed6, 0xfed7, 0xfed8]], // qaf
  [0x0643, [0xfed9, 0xfeda, 0xfedb, 0xfedc]], // kaf
  [0x0644, [0xfedd, 0xfede, 0xfedf, 0xfee0]], // lam
  [0x0645, [0xfee1, 0xfee2, 0xfee3, 0xfee4]], // meem
  [0x0646, [0xfee5, 0xfee6, 0xfee7, 0xfee8]], // noon
  [0x0647, [0xfee9, 0xfeea, 0xfeeb, 0xfeec]], // heh
  [0x0648, [0xfeed, 0xfeee]], // waw
  [0x0649, [0xfeef, 0xfef0]], // alef maksura
  [0x064a, [0xfef1, 0xfef2, 0xfef3, 0xfef4]], // yeh
  // Persian, Urdu and Sindhi letters, from the FB50 block.
  [0x0679, [0xfb66, 0xfb67, 0xfb68, 0xfb69]], // tteh
  [0x067e, [0xfb56, 0xfb57, 0xfb58, 0xfb59]], // peh
  [0x0686, [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d]], // tcheh
  [0x0688, [0xfb88, 0xfb89]], // ddal
  [0x0698, [0xfb8a, 0xfb8b]], // jeh
  [0x06a9, [0xfb8e, 0xfb8f, 0xfb90, 0xfb91]], // keheh
  [0x06af, [0xfb92, 0xfb93, 0xfb94, 0xfb95]], // gaf
  [0x06ba, [0xfb9e, 0xfb9f]], // noon ghunna
  [0x06be, [0xfbaa, 0xfbab, 0xfbac, 0xfbad]], // heh doachashmee
  [0x06c1, [0xfba6, 0xfba7, 0xfba8, 0xfba9]], // heh goal
  [0x06cc, [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff]], // farsi yeh
  [0x06d2, [0xfbae, 0xfbaf]], // yeh barree
]);

/**
 * Lam followed by an alef is written as one glyph, not two.
 *
 * This is the one ligature Arabic requires rather than prefers — a lam
 * and an alef side by side is simply not how the pair is written — so it
 * is the one ligature applied here.
 */
const LAM_ALEF = new Map<number, readonly [isolated: number, final: number]>([
  [0x0622, [0xfef5, 0xfef6]],
  [0x0623, [0xfef7, 0xfef8]],
  [0x0625, [0xfef9, 0xfefa]],
  [0x0627, [0xfefb, 0xfefc]],
]);

const LAM = 0x0644;

/** Bracket-like characters, which point the other way in an RTL run. */
const MIRRORED = new Map<number, number>([
  [0x0028, 0x0029],
  [0x0029, 0x0028],
  [0x005b, 0x005d],
  [0x005d, 0x005b],
  [0x007b, 0x007d],
  [0x007d, 0x007b],
  [0x003c, 0x003e],
  [0x003e, 0x003c],
  [0x00ab, 0x00bb],
  [0x00bb, 0x00ab],
  [0x2039, 0x203a],
  [0x203a, 0x2039],
  [0x201c, 0x201d],
  [0x201d, 0x201c],
  [0x2018, 0x2019],
  [0x2019, 0x2018],
]);

const ZWNJ = 0x200c;
const ZWJ = 0x200d;

/** A combining mark: it hangs off the letter before it and joins nothing. */
function isMark(code: number): boolean {
  return (
    (code >= 0x0300 && code <= 0x036f) ||
    (code >= 0x0610 && code <= 0x061a) ||
    (code >= 0x064b && code <= 0x065f) ||
    code === 0x0670 ||
    (code >= 0x06d6 && code <= 0x06dc) ||
    (code >= 0x06df && code <= 0x06e4) ||
    (code >= 0x06e7 && code <= 0x06e8) ||
    (code >= 0x06ea && code <= 0x06ed)
  );
}

/** True for any script written right to left. */
function isRtlLetter(code: number): boolean {
  return (
    (code >= 0x0590 && code <= 0x05ff) ||
    (code >= 0x0600 && code <= 0x07bf) ||
    (code >= 0x0860 && code <= 0x08ff) ||
    (code >= 0xfb1d && code <= 0xfdff) ||
    (code >= 0xfe70 && code <= 0xfeff)
  );
}

function isArabicIndicDigit(code: number): boolean {
  return (
    (code >= 0x0660 && code <= 0x0669) ||
    (code >= 0x06f0 && code <= 0x06f9) ||
    code === 0x066b ||
    code === 0x066c
  );
}

/** True when the string holds anything this module needs to act on. */
function hasRtlText(text: string): boolean {
  for (const ch of text) {
    if (isRtlLetter(ch.codePointAt(0) ?? 0)) return true;
  }
  return false;
}

/**
 * The bidirectional classes this reordering distinguishes.
 *
 * The algorithm names two dozen; these five are the ones that change the
 * outcome once explicit embedding controls are out of scope.
 */
type BidiClass = "L" | "R" | "EN" | "AN" | "N";

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

function bidiClassOf(code: number): BidiClass {
  if (code >= 0x30 && code <= 0x39) return "EN";
  if (isArabicIndicDigit(code)) return "AN";
  if (isRtlLetter(code)) return "R";
  return LETTER_OR_DIGIT.test(String.fromCodePoint(code)) ? "L" : "N";
}

/**
 * How a character joins to its neighbours: both sides, the right only, or
 * neither. It comes from the shape table, since a letter with four forms
 * is by definition one that joins on both sides.
 */
type Joining = "dual" | "right" | "none";

function joiningOf(code: number): Joining {
  if (code === ZWJ) return "dual";
  if (code === ZWNJ) return "none";
  const forms = ARABIC_FORMS.get(code)?.length ?? 0;
  if (forms === 4) return "dual";
  return forms >= 2 ? "right" : "none";
}

/**
 * A base character and the marks riding on it.
 *
 * Reordering moves clusters, never their pieces: a mark drawn before its
 * letter would attach itself to whatever came earlier, since marks have
 * no width of their own to separate them.
 */
interface Cluster {
  base: number;
  marks: number[];
  cls: BidiClass;
  join: Joining;
  /**
   * The lam-alef ligature this cluster stands for, isolated and final
   * form. Resolved once the letter before the lam is known.
   */
  ligature?: readonly [isolated: number, final: number];
  /**
   * False for the joining controls, which decide how their neighbours
   * connect and are then not drawn.
   */
  drawn: boolean;
  level: number;
}

function toClusters(text: string): Cluster[] {
  const clusters: Cluster[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const last = clusters.at(-1);
    if (isMark(code) && last) {
      last.marks.push(code);
      continue;
    }
    clusters.push({
      base: code,
      marks: [],
      cls: bidiClassOf(code),
      join: joiningOf(code),
      drawn: code !== ZWNJ && code !== ZWJ,
      level: 0,
    });
  }
  return clusters;
}

/** Can this letter join to the one after it? */
function joinsForward(cluster: Cluster | undefined): boolean {
  return cluster?.join === "dual";
}

/** Can this letter join to the one before it? */
function joinsBackward(cluster: Cluster | undefined): boolean {
  return cluster?.join === "dual" || cluster?.join === "right";
}

/**
 * Pick a letter's shape from its neighbours.
 *
 * `hasGlyph` has the last word: a font that omits a presentation form —
 * some Kufic and display faces do — is better served the plain letter
 * than a missing-glyph box.
 */
function shapeOne(
  cluster: Cluster,
  before: Cluster | undefined,
  after: Cluster | undefined,
  hasGlyph: (code: number) => boolean
): number {
  const forms = ARABIC_FORMS.get(cluster.base);
  if (!forms) return cluster.base;
  const linkBefore = joinsForward(before);
  const linkAfter = joinsBackward(after);
  let form: number;
  if (forms.length === 4) {
    if (linkBefore && linkAfter) form = forms[3];
    else if (linkBefore) form = forms[1];
    else if (linkAfter) form = forms[2];
    else form = forms[0];
  } else if (forms.length === 2) {
    form = linkBefore ? forms[1] : forms[0];
  } else {
    form = forms[0];
  }
  return hasGlyph(form) ? form : cluster.base;
}

/** Fold every lam-alef pair into one cluster carrying both its forms. */
function applyLamAlef(
  clusters: readonly Cluster[],
  hasGlyph: (code: number) => boolean
): Cluster[] {
  const out: Cluster[] = [];
  let i = 0;
  while (i < clusters.length) {
    const lam = clusters[i];
    if (!lam) break;
    const alef = clusters[i + 1];
    const ligature =
      lam.base === LAM && alef ? LAM_ALEF.get(alef.base) : undefined;
    if (!ligature || !hasGlyph(ligature[0])) {
      out.push(lam);
      i += 1;
      continue;
    }
    // The pair joins backwards only, exactly as a bare alef does.
    out.push({
      ...lam,
      marks: [...lam.marks, ...(alef?.marks ?? [])],
      join: "right",
      ligature,
    });
    i += 2;
  }
  return out;
}

/** Resolve the shape of every cluster, ligatures included. */
function shapeArabic(
  clusters: readonly Cluster[],
  hasGlyph: (code: number) => boolean
): Cluster[] {
  const folded = applyLamAlef(clusters, hasGlyph);
  return folded.map((cluster, index) => {
    const before = folded[index - 1];
    const after = folded[index + 1];
    if (cluster.ligature) {
      const [isolated, final] = cluster.ligature;
      const useFinal = joinsForward(before) && hasGlyph(final);
      return { ...cluster, base: useFinal ? final : isolated };
    }
    return { ...cluster, base: shapeOne(cluster, before, after, hasGlyph) };
  });
}

/** The level a strong class sits at inside a paragraph of `base` level. */
function levelFor(cls: BidiClass, base: number): number {
  if (cls === "R") return 1;
  if (cls === "AN") return 2;
  if (cls === "EN") return base === 1 ? 2 : 0;
  return base === 1 ? 2 : 0;
}

/**
 * Which side of the line a character pulls towards, or nothing when it is
 * a neutral with no direction of its own.
 */
type NeutralSide = "L" | "R" | undefined;

/** The direction a neutral inherits: numbers count as right-to-left. */
function strongSideOf(cls: BidiClass): NeutralSide {
  if (cls === "L") return "L";
  if (cls === "R" || cls === "EN" || cls === "AN") return "R";
  return undefined;
}

/**
 * Levels for every cluster.
 *
 * Strong characters take theirs from their class; a neutral run takes the
 * direction it is surrounded by, and the paragraph's own direction when
 * the two sides disagree — which is what puts a space between an Arabic
 * word and a Latin one on the side the reader expects. A run of neutrals
 * at either end has only one side, so it takes the paragraph's direction
 * too, and trailing whitespace lands where the line ends.
 */
function assignLevels(clusters: readonly Cluster[], base: number): void {
  const sides = clusters.map((cluster) => strongSideOf(cluster.cls));
  for (const [index, cluster] of clusters.entries()) {
    if (cluster.cls !== "N") {
      cluster.level = levelFor(cluster.cls, base);
      continue;
    }
    let before: NeutralSide;
    for (let i = index - 1; i >= 0 && !before; i--) before = sides[i];
    let after: NeutralSide;
    for (let i = index + 1; i < clusters.length && !after; i++)
      after = sides[i];
    const paragraph = base === 1 ? "R" : "L";
    const resolved = before === after && before ? before : paragraph;
    cluster.level = levelFor(resolved, base);
  }
}

/**
 * The reordering rule: from the deepest level outward, reverse every run
 * that reaches it. Two reversals cancel, which is exactly how a Latin
 * phrase inside an Arabic sentence comes back out reading forwards.
 */
function reorder(clusters: Cluster[]): Cluster[] {
  const max = clusters.reduce(
    (high, cluster) => Math.max(high, cluster.level),
    0
  );
  const out = [...clusters];
  for (let level = max; level >= 1; level--) {
    let start = -1;
    for (let i = 0; i <= out.length; i++) {
      const inRun = i < out.length && (out[i]?.level ?? 0) >= level;
      if (inRun && start < 0) start = i;
      else if (!inRun && start >= 0) {
        const run = out.slice(start, i).reverse();
        out.splice(start, run.length, ...run);
        start = -1;
      }
    }
  }
  return out;
}

/** Options for {@link toDrawingOrder}. */
export interface DrawingOrderOptions {
  /** The paragraph direction the cell is laid out in. */
  rtl: boolean;
  /**
   * Whether the font can draw a code point. Presentation forms and
   * ligatures fall back to the plain letter when it cannot.
   */
  hasGlyph?: (code: number) => boolean;
}

/**
 * Turn logical text into the sequence of code points to draw, left to
 * right.
 *
 * Latin-only text comes back unchanged, so a table with no Arabic in it
 * pays nothing and produces the same bytes it always did.
 *
 * @param text - The text as it was written.
 * @param options - Paragraph direction, and what the font can draw.
 * @returns The same characters, shaped and in drawing order.
 */
export function toDrawingOrder(
  text: string,
  options: DrawingOrderOptions
): string {
  if (text === "") return "";
  const hasGlyph = options.hasGlyph ?? (() => true);
  if (!options.rtl && !hasRtlText(text)) return text;
  const clusters = shapeArabic(toClusters(text), hasGlyph);
  const base = options.rtl ? 1 : 0;
  assignLevels(clusters, base);
  const ordered = reorder(clusters);
  let out = "";
  for (const cluster of ordered) {
    if (!cluster.drawn) continue;
    const mirrored =
      cluster.level % 2 === 1 ? MIRRORED.get(cluster.base) : undefined;
    out += String.fromCodePoint(mirrored ?? cluster.base);
    for (const mark of cluster.marks) out += String.fromCodePoint(mark);
  }
  return out;
}
