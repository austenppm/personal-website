import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export. The whole site prerenders — no server needed.
  // Cloudflare Pages serves the /out directory directly.
  output: "export",

  // next/image's default optimizer requires a Node runtime. Turn it off
  // so the static export works.
  images: {
    unoptimized: true,
  },

  // Cloudflare's static hosting serves /foo/index.html for /foo cleanly
  // when the emitted files use trailing slashes.
  trailingSlash: true,
};

export default nextConfig;
