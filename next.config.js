/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist optionally requires 'canvas' (Node only) - not needed in the browser
    config.resolve.alias.canvas = false;
    return config;
  },
};
module.exports = nextConfig;
