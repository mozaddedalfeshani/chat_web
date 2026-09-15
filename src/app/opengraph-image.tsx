import { ImageResponse } from "next/og";
import { PRODUCT_NAME, SITE_URL } from "@/lib/site";

export const alt =
  "AbabilX Chat — end-to-end encrypted personal and workspace messaging";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const logoUrl = new URL("/logo.png", SITE_URL).toString();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 18% 20%, rgba(225, 29, 72, 0.28), transparent 32%), radial-gradient(circle at 84% 78%, rgba(99, 102, 241, 0.2), transparent 34%), linear-gradient(135deg, #070711 0%, #1a0a12 48%, #080914 100%)",
          color: "#f8fafc",
          padding: 72,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 40,
          }}
        >
          <img
            src={logoUrl}
            width={88}
            height={88}
            alt=""
            style={{ borderRadius: 20 }}
          />
          <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1.4 }}>
            {PRODUCT_NAME}
          </span>
        </div>
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: -2,
            marginBottom: 18,
            textAlign: "center",
            maxWidth: 920,
            lineHeight: 1.15,
          }}
        >
          Encrypted chat for people and teams
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "#fecdd3",
            textAlign: "center",
            maxWidth: 860,
            lineHeight: 1.35,
          }}
        >
          AbabilX Chat · personal DMs · workspace groups · E2EE · chat.ababilx.com
        </div>
      </div>
    ),
    { ...size },
  );
}
