import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Read fonts off disk so we need the Node runtime, not the Edge one.
export const runtime = "nodejs";

export const alt =
  "SNAP payment error rates and the OBBBA state cost share — Axiom Foundation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Axiom design tokens (kept in sync with @axiom-foundation/ui/tokens.css).
const PAPER = "#faf9f6";
const INK = "#1c1917";
const INK_SECONDARY = "#57534e";
const INK_MUTED = "#78716c";
const ACCENT = "#92400e";
const RULE = "#e7e5e4";

const FONT_DIR = join(process.cwd(), "node_modules/geist/dist/fonts");

type Font = NonNullable<
  ConstructorParameters<typeof ImageResponse>[1]
>["fonts"] extends (infer F)[] | undefined
  ? F
  : never;

function loadFont(rel: string, name: string, weight: 400 | 600): Font | null {
  try {
    return { name, data: readFileSync(join(FONT_DIR, rel)), weight, style: "normal" };
  } catch {
    // If the font can't be read at build time we fall back to Satori's
    // default face rather than failing the build.
    return null;
  }
}

export default function OpengraphImage() {
  const fonts = [
    loadFont("geist-sans/Geist-Regular.ttf", "Geist", 400),
    loadFont("geist-sans/Geist-SemiBold.ttf", "Geist", 600),
    loadFont("geist-mono/GeistMono-Regular.ttf", "Geist Mono", 400),
  ].filter((f): f is Font => f !== null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "76px 80px",
          background: PAPER,
          fontFamily: "Geist",
          position: "relative",
        }}
      >
        {/* Faint editorial ∀ mark, bottom-right marginalia. Drawn as a path
            (same geometry as the favicon) rather than a font glyph so it
            renders identically regardless of the available typeface. */}
        <svg
          width={560}
          height={560}
          viewBox="0 0 100 100"
          style={{ position: "absolute", bottom: -130, right: -60, opacity: 0.05 }}
        >
          <g transform="translate(14, 10) scale(0.37)">
            <g transform="translate(0,290) scale(1,-1)">
              <path
                d="M29.45 290L6.51 290L86.80 69.90L114.70 69.90L194.68 290L171.74 290L148.18 223.97L53.01 223.97L29.45 290ZM100.75 88.81L60.14 203.51L141.05 203.51L100.75 88.81Z"
                fill={ACCENT}
              />
            </g>
          </g>
        </svg>

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "Geist Mono",
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: INK_MUTED,
          }}
        >
          <span style={{ color: ACCENT }}>Axiom Foundation</span>
          <span style={{ color: RULE }}>/</span>
          <span>SNAP quality control</span>
        </div>

        {/* Title + supporting line */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 82,
              fontWeight: 600,
              letterSpacing: -2.5,
              lineHeight: 1.04,
              color: INK,
              maxWidth: 940,
            }}
          >
            SNAP error rates now carry a price. How much is noise?
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.4,
              color: INK_SECONDARY,
              maxWidth: 880,
            }}
          >
            FY2025 rates, the 0–15% OBBBA cost share, and the sampling error
            that decides nine-figure band assignments.
          </div>
        </div>

        {/* Footline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: "Geist Mono",
            fontSize: 22,
            letterSpacing: 2,
            color: INK_MUTED,
          }}
        >
          <span
            style={{
              display: "flex",
              padding: "8px 16px",
              border: `1px solid ${RULE}`,
              borderRadius: 6,
              color: INK,
            }}
          >
            7 U.S.C. 2013(a)(2)
          </span>
          <span>FY2025 rates · 53 state agencies · $9.4B at stake</span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
