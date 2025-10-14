import { fromUrl } from 'geotiff';

function buildTileUrl(baseUrl, fileName) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/${fileName}`;
}

export function createTileLoader(options = {}) {
  const { baseUrl = '/geo', fromUrlImpl = fromUrl } = options;
  const cache = new Map();
  const inflight = new Map();

  const logHeadResponse = async (url, tileId) => {
    if (inflight.has(`head-${tileId}`)) {
      return inflight.get(`head-${tileId}`);
    }
    const headPromise = fetch(url, { method: 'HEAD' })
      .then((response) => {
        console.log('[TileLoader] HEAD response:', {
          tileId,
          ok: response.ok,
          status: response.status,
          acceptRanges: response.headers.get('accept-ranges'),
          contentLength: response.headers.get('content-length'),
        });
      })
      .catch((error) => {
        console.warn('[TileLoader] HEAD request failed:', tileId, error);
      })
      .finally(() => {
        inflight.delete(`head-${tileId}`);
      });
    inflight.set(`head-${tileId}`, headPromise);
    return headPromise;
  };

  const loadTile = async (tile) => {
    if (!tile) return null;
    if (cache.has(tile.id)) {
      console.log('[TileLoader] Using cached tile:', tile.id);
      return cache.get(tile.id);
    }

    if (inflight.has(tile.id)) {
      console.log('[TileLoader] Awaiting inflight tile:', tile.id);
      return inflight.get(tile.id);
    }

    const url = buildTileUrl(baseUrl, tile.fileName);
    console.log('[TileLoader] Loading tile from:', url);
    const loadPromise = (async () => {
      try {
        await logHeadResponse(url, tile.id);
        const tiff = await fromUrlImpl(url, {
          cacheSize: 1024,
          allowFullFile: true,
          maxOutputPixels: Infinity,
        });
        const image = await tiff.getImage();
        const meta = {
          width: image.getWidth(),
          height: image.getHeight(),
          bbox: image.getBoundingBox(),
          noDataValue: image.getGDALNoData(),
          resolutionX: image.getResolution?.()[0] ?? null,
          resolutionY: image.getResolution?.()[1] ?? null,
        };

        console.log('[TileLoader] Loaded tile metadata:', {
          id: tile.id,
          width: meta.width,
          height: meta.height,
          bbox: meta.bbox,
          noDataValue: meta.noDataValue,
        });

        const record = { tile, image, meta };
        cache.set(tile.id, record);
        return record;
      } catch (error) {
        console.error('[TileLoader] Failed to load tile:', tile.id, error);
        cache.delete(tile.id);
        throw error;
      } finally {
        inflight.delete(tile.id);
      }
    })();

    inflight.set(tile.id, loadPromise);
    return loadPromise;
  };

  const clear = () => {
    cache.clear();
    inflight.clear();
  };

  return {
    loadTile,
    getCachedTile: (id) => cache.get(id) || null,
    clear,
  };
}
