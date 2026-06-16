import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The shared @axiom-foundation/ui Nav links "Docs" to a root-relative
      // /docs, which only exists on the main marketing site. On this satellite
      // app, send it to the canonical docs instead of 404ing.
      {
        source: "/docs",
        destination: "https://axiom-foundation.org/docs",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
