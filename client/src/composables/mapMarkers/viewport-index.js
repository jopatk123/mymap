export function adjustCellSizeByZoom(map, currentSize) {
  try {
    const z = typeof map.value.getZoom === 'function' ? map.value.getZoom() : null;
    if (typeof z !== 'number' || isNaN(z)) return currentSize;
    let newSize = 0.05;
    if (z <= 6) newSize = 1.0;
    else if (z <= 9) newSize = 0.5;
    else if (z <= 12) newSize = 0.1;
    else if (z <= 15) newSize = 0.05;
    else newSize = 0.02;
    return newSize;
  } catch {
    return currentSize;
  }
}

export function buildSpatialIndexSync({
  sourcePoints,
  coordCache,
  spatialIndex,
  getDisplayCoordinates,
  getCellKey,
}) {
  spatialIndex.clear();
  for (const p of sourcePoints) {
    let coords = coordCache.get(p.id);
    if (!coords) {
      coords = getDisplayCoordinates(p);
      if (coords) coordCache.set(p.id, coords);
    }
    if (!coords) continue;
    const [lng, lat] = coords;
    if (!isFinite(lat) || !isFinite(lng)) continue;
    const key = getCellKey(lng, lat);
    let bucket = spatialIndex.get(key);
    if (!bucket) {
      bucket = [];
      spatialIndex.set(key, bucket);
    }
    bucket.push(p);
  }
}
