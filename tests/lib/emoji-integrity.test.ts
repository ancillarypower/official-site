import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { describe, it, expect } from "vitest";

/**
 * Emoji Integrity Test (Issue #506)
 *
 * Static analysis test that scans all source files under `src/` for
 * text-default emoji codepoints missing the Variation Selector-16
 * (U+FE0F). Without U+FE0F, these characters may render as monochrome
 * text glyphs or raw codepoint strings on some platforms (the root cause
 * of Issue #505).
 *
 * This test runs at CI time with zero runtime cost to the application.
 */

// ── Text-default emoji codepoints ──────────────────────────────────
// Unicode codepoints where Emoji=Yes AND Emoji_Presentation=No.
// These REQUIRE U+FE0F to guarantee emoji presentation across platforms.
// Only includes codepoints commonly used in web UI; extend as needed.
const TEXT_DEFAULT_EMOJI: ReadonlyMap<number, string> = new Map([
  // Miscellaneous Symbols (U+2600–U+26FF)
  [0x2600, "BLACK SUN WITH RAYS"],
  [0x2601, "CLOUD"],
  [0x2602, "UMBRELLA"],
  [0x2603, "SNOWMAN"],
  [0x2604, "COMET"],
  [0x260e, "BLACK TELEPHONE"],
  [0x2611, "BALLOT BOX WITH CHECK"],
  [0x2614, "UMBRELLA WITH RAIN DROPS"],
  [0x2615, "HOT BEVERAGE"],
  [0x2618, "SHAMROCK"],
  [0x261d, "WHITE UP POINTING INDEX"],
  [0x2620, "SKULL AND CROSSBONES"],
  [0x2622, "RADIOACTIVE SIGN"],
  [0x2623, "BIOHAZARD SIGN"],
  [0x2626, "ORTHODOX CROSS"],
  [0x262a, "STAR AND CRESCENT"],
  [0x262e, "PEACE SYMBOL"],
  [0x262f, "YIN YANG"],
  [0x2638, "WHEEL OF DHARMA"],
  [0x2639, "WHITE FROWNING FACE"],
  [0x263a, "WHITE SMILING FACE"],
  [0x2640, "FEMALE SIGN"],
  [0x2642, "MALE SIGN"],
  [0x2648, "ARIES"],
  [0x2649, "TAURUS"],
  [0x264a, "GEMINI"],
  [0x264b, "CANCER"],
  [0x264c, "LEO"],
  [0x264d, "VIRGO"],
  [0x264e, "LIBRA"],
  [0x264f, "SCORPIUS"],
  [0x2650, "SAGITTARIUS"],
  [0x2651, "CAPRICORN"],
  [0x2652, "AQUARIUS"],
  [0x2653, "PISCES"],
  [0x265f, "BLACK CHESS PAWN"],
  [0x2660, "BLACK SPADE SUIT"],
  [0x2663, "BLACK CLUB SUIT"],
  [0x2665, "BLACK HEART SUIT"],
  [0x2666, "BLACK DIAMOND SUIT"],
  [0x2668, "HOT SPRINGS"],
  [0x267b, "BLACK UNIVERSAL RECYCLING SYMBOL"],
  [0x267e, "PERMANENT PAPER SIGN"],
  [0x267f, "WHEELCHAIR SYMBOL"],
  [0x2692, "HAMMER AND PICK"],
  [0x2693, "ANCHOR"],
  [0x2694, "CROSSED SWORDS"],
  [0x2695, "STAFF OF AESCULAPIUS"],
  [0x2696, "SCALES"],
  [0x2697, "ALEMBIC"],
  [0x2699, "GEAR"],
  [0x269b, "ATOM SYMBOL"],
  [0x269c, "FLEUR-DE-LIS"],
  [0x26a0, "WARNING SIGN"],
  [0x26a1, "HIGH VOLTAGE SIGN"],
  [0x26a7, "MALE WITH STROKE AND MALE AND FEMALE SIGN"],
  [0x26aa, "MEDIUM WHITE CIRCLE"],
  [0x26ab, "MEDIUM BLACK CIRCLE"],
  [0x26b0, "COFFIN"],
  [0x26b1, "FUNERAL URN"],
  [0x26bd, "SOCCER BALL"],
  [0x26be, "BASEBALL"],
  [0x26c4, "SNOWMAN WITHOUT SNOW"],
  [0x26c5, "SUN BEHIND CLOUD"],
  [0x26c8, "THUNDER CLOUD AND RAIN"],
  [0x26cf, "PICK"],
  [0x26d1, "RESCUE WORKER'S HELMET"],
  [0x26d3, "CHAINS"],
  [0x26e9, "SHINTO SHRINE"],
  [0x26ea, "CHURCH"],
  [0x26f0, "MOUNTAIN"],
  [0x26f1, "UMBRELLA ON GROUND"],
  [0x26f2, "FOUNTAIN"],
  [0x26f3, "FLAG IN HOLE"],
  [0x26f4, "FERRY"],
  [0x26f5, "SAILBOAT"],
  [0x26f7, "SKIER"],
  [0x26f8, "ICE SKATE"],
  [0x26f9, "PERSON WITH BALL"],
  [0x26fa, "TENT"],
  [0x26fd, "FUEL PUMP"],
  // Dingbats (U+2700–U+27BF)
  [0x2702, "BLACK SCISSORS"],
  [0x2708, "AIRPLANE"],
  [0x2709, "ENVELOPE"],
  [0x270a, "RAISED FIST"],
  [0x270b, "RAISED HAND"],
  [0x270c, "VICTORY HAND"],
  [0x270d, "WRITING HAND"],
  [0x270f, "PENCIL"],
  [0x2712, "BLACK NIB"],
  [0x2714, "HEAVY CHECK MARK"],
  [0x2716, "HEAVY MULTIPLICATION X"],
  [0x271d, "LATIN CROSS"],
  [0x2721, "STAR OF DAVID"],
  [0x2733, "EIGHT SPOKED ASTERISK"],
  [0x2734, "EIGHT POINTED BLACK STAR"],
  [0x2744, "SNOWFLAKE"],
  [0x2747, "SPARKLE"],
  [0x2763, "HEAVY HEART EXCLAMATION MARK ORNAMENT"],
  [0x2764, "HEAVY BLACK HEART"],
  [0x27a1, "BLACK RIGHTWARDS ARROW"],
  [0x27b0, "CURLY LOOP"],
  // Supplemental Arrows-B
  [0x2934, "ARROW POINTING RIGHTWARDS THEN CURVING UPWARDS"],
  [0x2935, "ARROW POINTING RIGHTWARDS THEN CURVING DOWNWARDS"],
  // Miscellaneous Symbols and Arrows
  [0x2b05, "LEFTWARDS BLACK ARROW"],
  [0x2b06, "UPWARDS BLACK ARROW"],
  [0x2b07, "DOWNWARDS BLACK ARROW"],
  [0x2b1b, "BLACK LARGE SQUARE"],
  [0x2b1c, "WHITE LARGE SQUARE"],
  [0x2b50, "WHITE MEDIUM STAR"],
  [0x2b55, "HEAVY LARGE CIRCLE"],
  // CJK Symbols and Punctuation
  [0x3030, "WAVY DASH"],
  [0x303d, "PART ALTERNATION MARK"],
  // Enclosed CJK Letters and Months
  [0x3297, "CIRCLED IDEOGRAPH CONGRATULATION"],
  [0x3299, "CIRCLED IDEOGRAPH SECRET"],
  // Supplemental Symbols (U+1F300+) with Emoji_Presentation=No
  [0x1f004, "MAHJONG TILE RED DRAGON"],
  [0x1f0cf, "PLAYING CARD BLACK JOKER"],
  [0x1f170, "NEGATIVE SQUARED LATIN CAPITAL LETTER A"],
  [0x1f171, "NEGATIVE SQUARED LATIN CAPITAL LETTER B"],
  [0x1f17e, "NEGATIVE SQUARED LATIN CAPITAL LETTER O"],
  [0x1f17f, "NEGATIVE SQUARED LATIN CAPITAL LETTER P"],
  [0x1f202, "SQUARED KATAKANA SA"],
  [0x1f21a, "SQUARED CJK UNIFIED IDEOGRAPH-7121"],
  [0x1f22f, "SQUARED CJK UNIFIED IDEOGRAPH-6307"],
  [0x1f237, "SQUARED CJK UNIFIED IDEOGRAPH-6708"],
  [0x1f321, "THERMOMETER"],
  [0x1f396, "MILITARY MEDAL"],
  [0x1f397, "REMINDER RIBBON"],
  [0x1f399, "STUDIO MICROPHONE"],
  [0x1f39a, "LEVEL SLIDER"],
  [0x1f39b, "CONTROL KNOBS"],
  [0x1f39e, "FILM FRAMES"],
  [0x1f39f, "ADMISSION TICKETS"],
  [0x1f3cb, "WEIGHT LIFTER"],
  [0x1f3cc, "GOLFER"],
  [0x1f3cd, "RACING MOTORCYCLE"],
  [0x1f3ce, "RACING CAR"],
  [0x1f3f3, "WAVING WHITE FLAG"],
  [0x1f3f5, "ROSETTE"],
  [0x1f3f7, "LABEL"],
  [0x1f43f, "CHIPMUNK"],
  [0x1f441, "EYE"],
  [0x1f4fd, "FILM PROJECTOR"],
  [0x1f549, "OM SYMBOL"],
  [0x1f54a, "DOVE OF PEACE"],
  [0x1f56f, "CANDLE"],
  [0x1f570, "MANTELPIECE CLOCK"],
  [0x1f573, "HOLE"],
  [0x1f574, "MAN IN BUSINESS SUIT LEVITATING"],
  [0x1f575, "SLEUTH OR SPY"],
  [0x1f576, "DARK SUNGLASSES"],
  [0x1f577, "SPIDER"],
  [0x1f578, "SPIDER WEB"],
  [0x1f579, "JOYSTICK"],
  [0x1f587, "LINKED PAPERCLIPS"],
  [0x1f58a, "LOWER LEFT BALLPOINT PEN"],
  [0x1f58b, "LOWER LEFT FOUNTAIN PEN"],
  [0x1f58c, "LOWER LEFT PAINTBRUSH"],
  [0x1f58d, "LOWER LEFT CRAYON"],
  [0x1f590, "RAISED HAND WITH FINGERS SPLAYED"],
  [0x1f5a4, "BLACK HEART"],
  [0x1f5a5, "DESKTOP COMPUTER"],
  [0x1f5a8, "PRINTER"],
  [0x1f5b1, "THREE BUTTON MOUSE"],
  [0x1f5b2, "TRACKBALL"],
  [0x1f5bc, "FRAME WITH PICTURE"],
  [0x1f5c2, "CARD INDEX DIVIDERS"],
  [0x1f5c3, "CARD FILE BOX"],
  [0x1f5c4, "FILE CABINET"],
  [0x1f5d1, "WASTEBASKET"],
  [0x1f5d2, "SPIRAL NOTE PAD"],
  [0x1f5d3, "SPIRAL CALENDAR PAD"],
  [0x1f5dc, "COMPRESSION"],
  [0x1f5dd, "OLD KEY"],
  [0x1f5de, "ROLLED-UP NEWSPAPER"],
  [0x1f5e1, "DAGGER KNIFE"],
  [0x1f5e3, "SPEAKING HEAD IN SILHOUETTE"],
  [0x1f5e8, "LEFT SPEECH BUBBLE"],
  [0x1f5ef, "RIGHT ANGER BUBBLE"],
  [0x1f5f3, "BALLOT BOX WITH BALLOT"],
  [0x1f5fa, "WORLD MAP"],
  [0x1f6cb, "COUCH AND LAMP"],
  [0x1f6cd, "SHOPPING BAGS"],
  [0x1f6ce, "BELLHOP BELL"],
  [0x1f6cf, "BED"],
  [0x1f6e0, "HAMMER AND WRENCH"],
  [0x1f6e1, "SHIELD"],
  [0x1f6e2, "OIL DRUM"],
  [0x1f6e3, "MOTORWAY"],
  [0x1f6e4, "RAILWAY TRACK"],
  [0x1f6e5, "MOTOR BOAT"],
  [0x1f6e9, "SMALL AIRPLANE"],
  [0x1f6f0, "SATELLITE"],
  [0x1f6f3, "PASSENGER SHIP"],
]);

/** Variation Selector-16 codepoint. */
const VS16 = 0xfe0f;

interface Violation {
  file: string;
  line: number;
  column: number;
  char: string;
  codePoint: string;
  name: string;
}

/**
 * Recursively collect all .ts and .tsx file paths under a directory.
 */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Strip single-line (//) and multi-line comments from a line.
 * Returns the line with comment regions replaced by spaces (preserving
 * column positions for accurate violation reporting).
 */
function stripComments(
  line: string,
  inComment: boolean,
): { stripped: string; inComment: boolean } {
  let result = "";
  let i = 0;

  while (i < line.length) {
    if (inComment) {
      const endIdx = line.indexOf("*/", i);
      if (endIdx === -1) {
        result += " ".repeat(line.length - i);
        i = line.length;
      } else {
        result += " ".repeat(endIdx - i + 2);
        i = endIdx + 2;
        inComment = false;
      }
    } else {
      if (line[i] === "/" && line[i + 1] === "/") {
        result += " ".repeat(line.length - i);
        i = line.length;
      } else if (line[i] === "/" && line[i + 1] === "*") {
        const endIdx = line.indexOf("*/", i + 2);
        if (endIdx === -1) {
          result += " ".repeat(line.length - i);
          i = line.length;
          inComment = true;
        } else {
          result += " ".repeat(endIdx - i + 2);
          i = endIdx + 2;
        }
      } else {
        result += line[i];
        i++;
      }
    }
  }

  return { stripped: result, inComment };
}

/**
 * Scan a single source file for text-default emoji missing U+FE0F.
 */
function scanFile(filePath: string, relPath: string): Violation[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: Violation[] = [];
  let inComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx]!;
    const { stripped, inComment: newInComment } = stripComments(
      rawLine,
      inComment,
    );
    inComment = newInComment;

    const codePoints = [...rawLine];
    let colOffset = 0;

    for (let cpIdx = 0; cpIdx < codePoints.length; cpIdx++) {
      const cp = codePoints[cpIdx]!.codePointAt(0)!;

      if (TEXT_DEFAULT_EMOJI.has(cp)) {
        // Check the corresponding position in stripped line is not a space
        // (would mean it was inside a comment)
        if (stripped[colOffset] !== " " || rawLine[colOffset] !== " ") {
          const nextCp = codePoints[cpIdx + 1]?.codePointAt(0);
          if (nextCp !== VS16) {
            violations.push({
              file: relPath,
              line: lineIdx + 1,
              column: colOffset + 1,
              char: codePoints[cpIdx]!,
              codePoint: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
              name: TEXT_DEFAULT_EMOJI.get(cp)!,
            });
          }
        }
      }

      colOffset += codePoints[cpIdx]!.length;
    }
  }

  return violations;
}

// ── Test ────────────────────────────────────────────────────────────

const SRC_DIR = join(__dirname, "../../src");

describe("Emoji integrity (Issue #506)", () => {
  it("all user-visible text-default emoji include U+FE0F variation selector", () => {
    const files = collectSourceFiles(SRC_DIR);
    const allViolations: Violation[] = [];

    for (const filePath of files) {
      const rel = relative(join(__dirname, "../.."), filePath);
      allViolations.push(...scanFile(filePath, rel));
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map(
          (v) =>
            `  ${v.file}:${v.line}:${v.column} \u2014 ${v.char} (${v.codePoint} ${v.name}) missing U+FE0F`,
        )
        .join("\n");

      expect.fail(
        `Found ${allViolations.length} text-default emoji without U+FE0F:\n${report}\n\n` +
          "Fix: append \\uFE0F after each flagged character to force emoji presentation.",
      );
    }
  });
});
