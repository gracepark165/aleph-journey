import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lesson content is read from content/ on the server; make sure deployments bundle it.
  outputFileTracingIncludes: { "/**": ["./content/**/*"] },
};

export default nextConfig;
