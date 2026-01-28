import L from 'leaflet';
import { createPointRenderer, createPopupContent } from '../kml-point-renderer.js';
import { processCoordinates } from '../kml-data-processor.js';
import { createPointIcon } from '../kml-icon-factory.js';

export function createKmlViewportRenderer({
  map,
  kmlFile,
  styleConfig,
  points,
  viewportPadding = 0.2,
  cellSizeDeg = 0.05,
}) {
  const renderer = createPointRenderer(kmlFile, styleConfig);
  const { layer, clusterGroup, featureGeoJson } = renderer;
  if (!layer) return null;

  try {
    for (const p of points) {
      if (!p || !p.point_type) continue;
      if (p.point_type === 'LineString' && p.coordinates && p.coordinates.points) {
        const lineCoords = processCoordinates(p.coordinates.points);
        if (Array.isArray(lineCoords) && lineCoords.length > 1) {
          featureGeoJson.addData({
            type: 'Feature',
            properties: {
              name: p.name || '未命名线条',
              description: p.description || '',
            },
            geometry: { type: 'LineString', coordinates: lineCoords },
          });
        }
      } else if (p.point_type === 'Polygon' && p.coordinates && p.coordinates.outer) {
        const polygonCoords = processCoordinates(p.coordinates.outer);
        if (Array.isArray(polygonCoords) && polygonCoords.length > 2) {
          featureGeoJson.addData({
            type: 'Feature',
            properties: {
              name: p.name || '未命名多边形',
              description: p.description || '',
            },
            geometry: { type: 'Polygon', coordinates: [polygonCoords] },
          });
        }
      }
    }
  } catch {}

  const rendered = new Map();
  const spatialIndex = new Map();
  let indexBuilt = false;

  const getCellKey = (lng, lat) => {
    const cx = Math.floor(lng / cellSizeDeg);
    const cy = Math.floor(lat / cellSizeDeg);
    return `${cx}:${cy}`;
  };

  const buildSpatialIndex = () => {
    spatialIndex.clear();
    for (const p of points) {
      if (!p || (p.point_type && p.point_type !== 'Point')) continue;
      const coordObj = processCoordinates(p);
      if (!coordObj || coordObj.lat == null || coordObj.lng == null) continue;
      const { lat, lng } = coordObj;
      if (!isFinite(lat) || !isFinite(lng)) continue;
      const key = getCellKey(lng, lat);
      let bucket = spatialIndex.get(key);
      if (!bucket) {
        bucket = [];
        spatialIndex.set(key, bucket);
      }
      bucket.push({ id: p.id, lat, lng, p });
    }
    indexBuilt = true;
  };

  const getCandidatesByBounds = (west, south, east, north) => {
    const minX = Math.floor(west / cellSizeDeg);
    const maxX = Math.floor(east / cellSizeDeg);
    const minY = Math.floor(south / cellSizeDeg);
    const maxY = Math.floor(north / cellSizeDeg);
    const out = [];
    const seen = new Set();
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x}:${y}`;
        const bucket = spatialIndex.get(key);
        if (!bucket || bucket.length === 0) continue;
        for (const item of bucket) {
          if (!seen.has(item.id)) {
            out.push(item);
            seen.add(item.id);
          }
        }
      }
    }
    return out;
  };

  const addVisibleMarkers = () => {
    if (!map.value || !clusterGroup) return;
    const bounds = map.value.getBounds()?.pad(viewportPadding);
    if (!bounds) return;
    if (!indexBuilt) buildSpatialIndex();
    const sw = bounds?._southWest;
    const ne = bounds?._northEast;
    if (!sw || !ne) return;
    const south = sw.lat,
      west = sw.lng,
      north = ne.lat,
      east = ne.lng;

    const current = new Set();
    const toAdd = [];
    const candidates = getCandidatesByBounds(west, south, east, north);
    for (const item of candidates) {
      const { id, lat, lng, p } = item;
      if (!(lat >= south && lat <= north && lng >= west && lng <= east)) continue;
      current.add(id);
      if (!rendered.has(id)) {
        const pointSize = styleConfig.point_size;
        const labelSize = Number(styleConfig.point_label_size);
        const pointColor = styleConfig.point_color;
        const labelColor = styleConfig.point_label_color;
        const pointOpacity = styleConfig.point_opacity;
        const iconOptions = createPointIcon(
          pointSize,
          pointColor,
          pointOpacity,
          labelSize,
          labelColor,
          p?.name || ''
        );
        const marker = L.marker([lat, lng], {
          icon: L.divIcon(iconOptions),
          updateWhenZoom: false,
        });
        try {
          const feature = {
            type: 'Feature',
            properties: {
              name: p?.name || '未命名点',
              description: p?.description || '',
            },
            geometry: { type: 'Point', coordinates: [lng, lat] },
          };
          if (
            p &&
            typeof p.latitude === 'number' &&
            typeof p.longitude === 'number' &&
            !isNaN(p.latitude) &&
            !isNaN(p.longitude)
          ) {
            feature.properties.wgs84_lat = Number(p.latitude);
            feature.properties.wgs84_lng = Number(p.longitude);
          }
          const popupContent = createPopupContent(feature, kmlFile);
          marker.bindPopup(popupContent);
          try {
            marker.on('click', (e) => {
              try {
                marker.openPopup && marker.openPopup();
              } catch (err) {}
              try {
                L.DomEvent.stopPropagation(e);
              } catch (err) {}
            });
          } catch (err) {}
        } catch {}
        toAdd.push([id, marker]);
      }
    }
    const toRemove = [];
    rendered.forEach((_, id) => {
      if (!current.has(id)) toRemove.push(id);
    });
    if (toRemove.length) {
      const removeMarkers = toRemove.map((id) => rendered.get(id)).filter(Boolean);
      try {
        if (removeMarkers.length) clusterGroup.removeLayers(removeMarkers);
      } catch {}
      toRemove.forEach((id) => rendered.delete(id));
    }
    if (toAdd.length) {
      const addMarkers = toAdd.map(([, m]) => m);
      try {
        clusterGroup.addLayers(addMarkers);
      } catch {}
      toAdd.forEach(([id, m]) => rendered.set(id, m));
    }
  };

  let isZooming = false;
  const onZoomStart = () => {
    isZooming = true;
  };
  const onZoomEnd = () => {
    isZooming = false;
    addVisibleMarkers();
  };
  const onMoveEnd = () => {
    if (!isZooming) addVisibleMarkers();
  };

  return {
    layer,
    clusterGroup,
    addVisibleMarkers,
    buildSpatialIndex,
    onMoveEnd,
    onZoomEnd,
    onZoomStart,
  };
}
