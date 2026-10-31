/*
 * Build settings. Vercel runs this as a Node server, so the studio desk can
 * check a password and commit.
 *
 * `import type` is erased after type-checking. It is not a runtime include.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./src/image-loader.ts",
  },
  trailingSlash: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Vercel rejects function request bodies over 4.5 MB before the action
      // runs, so a higher limit here would never be reached.
      bodySizeLimit: "4.5mb",
    },
  },
  outputFileTracingIncludes: {
    // The save action also runs from a painting's page, /curate/[slug].
    "/curate": ["./assets/fonts/LiberationSerif-Bold.ttf"],
    "/curate/*": ["./assets/fonts/LiberationSerif-Bold.ttf"],
  },
  async headers() {
    return [
      {
        // Every page. Refusing to be framed stops a site from overlaying
        // the desk to trick a signed-in click. The CSP starts with only
        // frame-ancestors so it cannot block the app's own scripts.
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // ":path*" matches zero or more segments, so this covers
        // /curate itself as well as anything under it.
        source: "/curate/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
