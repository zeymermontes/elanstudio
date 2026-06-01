import type { NextConfig } from "next";
import path from "node:path";

// A stray package-lock.json in the home directory makes Next infer the wrong
// "workspace root" and watch/trace the entire home folder (the original RAM &
// freeze problem). Pin the root to THIS project for every bundler.
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // Used by webpack/build file tracing — also scope it to this project.
  outputFileTracingRoot: projectRoot,
  images: {
    // The brand logo is an SVG served via next/image.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
};

export default nextConfig;
