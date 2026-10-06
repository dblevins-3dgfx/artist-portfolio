import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || "";
const githubPages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  ...(githubPages ? { output: "export" as const } : {}),
  images: {
    loader: "custom",
    loaderFile: "./src/image-loader.ts",
  },
  trailingSlash: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  outputFileTracingIncludes: {
    "/curate": ["./assets/fonts/LiberationSerif-Bold.ttf"],
  },
  ...(!githubPages
    ? {
        async headers() {
          return [
            {
              source: "/curate",
              headers: [
                { key: "X-Robots-Tag", value: "noindex, nofollow" },
                { key: "Cache-Control", value: "private, no-store" },
              ],
            },
            {
              source: "/curate/:path*",
              headers: [
                { key: "X-Robots-Tag", value: "noindex, nofollow" },
                { key: "Cache-Control", value: "private, no-store" },
              ],
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
