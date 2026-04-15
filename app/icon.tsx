import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#18181b",
          borderRadius: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 260, color: "#ffffff", fontWeight: 700, fontFamily: "sans-serif" }}>
          F
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
