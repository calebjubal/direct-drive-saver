/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep development manifests isolated from production build artifacts.
  // This prevents `next build` from invalidating a running `next dev` server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
