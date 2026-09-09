import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
     * Every listing photo is committed at 1440px wide or less (see
     * scripts/build-photos.mjs), so the default ladder's 1920/2048/3840 entries
     * can never return more detail than the source — they just add cache
     * entries and pad the preload srcSet. Capping the ladder at 1440 keeps the
     * candidates honest.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1440],
  },
};

export default nextConfig;
