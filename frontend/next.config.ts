import type { NextConfig } from "next";

// Cache Components is off on purpose: every RevoTask page is per-user data behind a session
// cookie, and the root layout reads that cookie (and the appearance cookie) so the first paint
// has the right user and theme. See CHANGELOG entry 16.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
