// Cover palette extraction.
// Pulls dominant + secondary perceptually distinct colors from an image,
// derives a contrast-aware text color and a bookmark accent.

export type CoverPalette = {
  dominant: string;
  secondary: string;
  text: string;
  bookmark: string;
};

type RGB = { r: number; g: number; b: number };

function hex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function luminance({ r, g, b }: RGB): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function rgbDistance(a: RGB, b: RGB): number {
  // Weighted Euclidean — rough perceptual distance in sRGB.
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function complement({ r, g, b }: RGB): RGB {
  return { r: 255 - r, g: 255 - g, b: 255 - b };
}

export async function extractCoverPalette(url: string): Promise<CoverPalette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = 60, h = 90;
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        // Bucket histogram, skip near-white / near-black / near-grey.
        const buckets = new Map<string, RGB & { n: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max > 240 && min > 240) continue; // near white
          if (max < 25) continue;               // near black
          if (max - min < 12 && max > 80 && max < 200) continue; // mid grey
          const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
          cur.r += r; cur.g += g; cur.b += b; cur.n += 1;
          buckets.set(key, cur);
        }
        if (buckets.size === 0) return resolve(null);

        const sorted = [...buckets.values()]
          .map((v) => ({ r: Math.round(v.r / v.n), g: Math.round(v.g / v.n), b: Math.round(v.b / v.n), n: v.n }))
          .sort((a, b) => b.n - a.n);

        const dominant: RGB = sorted[0];
        // Secondary = first cluster sufficiently distant from dominant.
        const minDist = 90;
        const secondary: RGB = sorted.slice(1).find((c) => rgbDistance(c, dominant) > minDist) ?? complement(dominant);

        const text = luminance(dominant) > 0.6 ? { r: 31, g: 38, b: 48 } : { r: 250, g: 251, b: 243 };

        // Bookmark = secondary if it has enough distance, else complementary tint.
        const bookmark =
          rgbDistance(secondary, dominant) > minDist ? secondary : complement(dominant);

        return resolve({
          dominant: hex(dominant),
          secondary: hex(secondary),
          text: hex(text),
          bookmark: hex(bookmark),
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
