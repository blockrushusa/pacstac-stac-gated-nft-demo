/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/pacstac-stac-gated-nft-demo",
  assetPrefix: "/pacstac-stac-gated-nft-demo/",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
