import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Read fonts off disk so we need the Node runtime, not the Edge one.
export const runtime = "nodejs";

export const alt =
  "SNAP payment error rates and the state cost share — PolicyEngine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// PolicyEngine design tokens (kept in sync with @policyengine/ui-kit theme).
const BACKGROUND = "#FFFFFF"; // --background
const FOREGROUND = "#101828"; // gray-900
const GRAY_600 = "#475569";
const GRAY_500 = "#64748B";
const TEAL = "#319795"; // --chart-1
const TEAL_700 = "#285E61";
const BORDER = "#E2E8F0"; // --border

const FONT_DIR = join(process.cwd(), "node_modules/@fontsource");

type Font = NonNullable<
  ConstructorParameters<typeof ImageResponse>[1]
>["fonts"] extends (infer F)[] | undefined
  ? F
  : never;

function loadFont(rel: string, name: string, weight: 400 | 600): Font | null {
  try {
    return {
      name,
      data: readFileSync(join(FONT_DIR, rel)),
      weight,
      style: "normal",
    };
  } catch {
    // Fall back to Satori's default face rather than failing the build.
    return null;
  }
}

export default function OpengraphImage() {
  const fonts = [
    loadFont("inter/files/inter-latin-400-normal.woff", "Inter", 400),
    loadFont("inter/files/inter-latin-600-normal.woff", "Inter", 600),
    loadFont(
      "jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff",
      "JetBrains Mono",
      400,
    ),
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
          background: BACKGROUND,
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* Band ramp marginalia: the statutory 0/5/10/15% tiers. */}
        <div
          style={{
            position: "absolute",
            right: 80,
            bottom: 96,
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          {[
            { h: 40, c: "#E8F2F2" },
            { h: 78, c: "#AFD3D1" },
            { h: 118, c: "#74B4B2" },
            { h: 160, c: TEAL },
          ].map((bar, index) => (
            <div
              key={index}
              style={{
                width: 54,
                height: bar.h,
                background: bar.c,
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
              }}
            />
          ))}
        </div>

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "JetBrains Mono",
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: GRAY_500,
          }}
        >
          <span style={{ color: TEAL_700, fontWeight: 600 }}>PolicyEngine</span>
          <span style={{ color: BORDER }}>/</span>
          <span>SNAP quality control</span>
        </div>

        {/* Title + supporting line */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 80,
              fontWeight: 600,
              letterSpacing: -2.5,
              lineHeight: 1.06,
              color: FOREGROUND,
              maxWidth: 980,
            }}
          >
            SNAP error rates now carry a price. How much is noise?
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 29,
              lineHeight: 1.4,
              color: GRAY_600,
              maxWidth: 860,
            }}
          >
            FY2025 payment error rates, the 0–15% state cost share, and the
            sampling error that decides nine-figure band assignments.
          </div>
        </div>

        {/* Footline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: "JetBrains Mono",
            fontSize: 22,
            letterSpacing: 2,
            color: GRAY_500,
          }}
        >
          <span
            style={{
              display: "flex",
              padding: "8px 16px",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              color: FOREGROUND,
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
