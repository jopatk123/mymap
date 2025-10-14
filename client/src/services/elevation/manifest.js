export const elevationTileManifest = [
  {
    id: 'srtm_60_06',
    fileName: 'srtm_60_06.tif',
    bounds: {
      minLat: 30,
      maxLat: 35,
      minLng: 115,
      maxLng: 120,
    },
  },
  {
    id: 'srtm_60_07',
    fileName: 'srtm_60_07.tif',
    bounds: {
      minLat: 25,
      maxLat: 30,
      minLng: 115,
      maxLng: 120,
    },
  },
  {
    id: 'srtm_60_08',
    fileName: 'srtm_60_08.tif',
    bounds: {
      minLat: 20,
      maxLat: 25,
      minLng: 115,
      maxLng: 120,
    },
  },
  {
    id: 'srtm_61_06',
    fileName: 'srtm_61_06.tif',
    bounds: {
      minLat: 30,
      maxLat: 35,
      minLng: 120,
      maxLng: 125,
    },
  },
  {
    id: 'srtm_61_07',
    fileName: 'srtm_61_07.tif',
    bounds: {
      minLat: 25,
      maxLat: 30,
      minLng: 120,
      maxLng: 125,
    },
  },
  {
    id: 'srtm_61_08',
    fileName: 'srtm_61_08.tif',
    bounds: {
      minLat: 20,
      maxLat: 25,
      minLng: 120,
      maxLng: 125,
    },
  },
];

export function findTileByCoordinate(lat, lng, tiles = elevationTileManifest) {
  return (
    tiles.find(
      ({ bounds }) =>
        lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng
    ) || null
  );
}

export function tilesIntersectingBounds(bounds, tiles = elevationTileManifest) {
  if (!bounds) return [];
  const { minLat, maxLat, minLng, maxLng } = bounds;
  return tiles.filter((tile) => {
    const { bounds: tileBounds } = tile;
    const intersectsLat = tileBounds.minLat < maxLat && tileBounds.maxLat > minLat;
    const intersectsLng = tileBounds.minLng < maxLng && tileBounds.maxLng > minLng;
    return intersectsLat && intersectsLng;
  });
}
