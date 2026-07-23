import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? "/Contando" : "",
  trailingSlash: isGitHubPages,
  images: { unoptimized: true },
  typescript: {
    // The Pages export does not use the Cloudflare worker or D1 helpers.
    // Keep those platform-only files out of Next's static type-check.
    tsconfigPath: isGitHubPages
      ? "./tsconfig.pages.json"
      : "./tsconfig.json",
  },
};

export default nextConfig;
