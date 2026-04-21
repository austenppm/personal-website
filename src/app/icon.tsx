import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "linear-gradient(135deg, #f59e0b 0%, #fb7d3c 50%, #fb7185 100%)",
          borderRadius: "50%",
        }}
      />
    ),
    size
  );
}
