import { fromUrl } from 'geotiff';

function buildTileUrl(baseUrl, fileName) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/${fileName}`;
}

export function createTileLoader(options = {}) {
  const { baseUrl = '/geo', fromUrlImpl = fromUrl } = options;
  const cache = new Map();

  const loadTile = async (tile) => {
    if (!tile) return null;
    if (cache.has(tile.id)) {
      return cache.get(tile.id);
    }

    const url = buildTileUrl(baseUrl, tile.fileName);
    const tiff = await fromUrlImpl(url, { cacheSize: 0, allowFullFile: false });
    const image = await tiff.getImage();
    const meta = {
      width: image.getWidth(),
      height: image.getHeight(),
      bbox: image.getBoundingBox(),
      noDataValue: image.getGDALNoData(),
      resolutionX: image.getResolution?.()[0] ?? null,
      resolutionY: image.getResolution?.()[1] ?? null,
    };

    const record = { tile, image, meta };
    cache.set(tile.id, record);
    return record;
  };

  const clear = () => cache.clear();

  return {
    loadTile,
    getCachedTile: (id) => cache.get(id) || null,
    clear,
  };
}
