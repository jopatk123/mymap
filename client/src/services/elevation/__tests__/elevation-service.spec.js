import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElevationService } from '../elevation-service.js';

const manifest = [
  {
    id: 'test-tile',
    fileName: 'test.tif',
    bounds: {
      minLat: 0,
      maxLat: 10,
      minLng: 0,
      maxLng: 10,
    },
  },
];

function createStubTileLoader() {
  const image = {
    readRasters: vi.fn(async (options) => {
      if (options.window) {
        const [x0, y0, x1, y1] = options.window;
        const width = Math.max(options.width ?? x1 - x0, 1);
        const height = Math.max(options.height ?? y1 - y0, 1);
        const data = new Float32Array(width * height);
        let index = 0;
        for (let y = y0; y < y0 + height; y += 1) {
          for (let x = x0; x < x0 + width; x += 1) {
            data[index] = 100 + x + y;
            index += 1;
          }
        }
        return data;
      }
      const { width, height } = options;
      const result = new Float32Array(width * height);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          result[y * width + x] = 50 + x + y;
        }
      }
      return result;
    }),
  };

  const loader = {
    loadTile: vi.fn(async () => ({
      tile: manifest[0],
      image,
      meta: {
        width: 4,
        height: 4,
        bbox: [0, 0, 10, 10],
        noDataValue: -32768,
      },
    })),
    clear: vi.fn(),
  };

  return loader;
}

describe('createElevationService', () => {
  let tileLoader;
  let service;

  beforeEach(() => {
    tileLoader = createStubTileLoader();
    service = createElevationService({ manifest, tileLoaderFactory: () => tileLoader });
  });

  it('returns elevation sample for covered coordinate', async () => {
    const result = await service.getElevation(5, 5);
    expect(result.hasData).toBe(true);
    expect(result.elevation).toBeGreaterThan(99);
    expect(tileLoader.loadTile).toHaveBeenCalledTimes(1);
  });

  it('returns no data outside coverage', async () => {
    const result = await service.getElevation(20, 20);
    expect(result.hasData).toBe(false);
    expect(result.elevation).toBeNull();
  });

  it('generates reusable contour features', async () => {
    const bounds = { minLat: 0, maxLat: 10, minLng: 0, maxLng: 10 };
    const first = await service.getContoursForBounds(bounds, { sampleSize: 8, thresholdStep: 10 });
    const second = await service.getContoursForBounds(bounds, { sampleSize: 8, thresholdStep: 10 });
    expect(first.features.length).toBeGreaterThan(0);
    expect(second.features.length).toBe(first.features.length);
    expect(tileLoader.loadTile).toHaveBeenCalledTimes(1);
  });
});
