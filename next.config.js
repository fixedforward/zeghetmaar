/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicitly set the Turbopack root to this project directory.
  // Without this, Turbopack detects multiple package-lock.json files and
  // may pick a parent directory as the workspace root, causing node_modules
  // resolution to fail.
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig