import { generateUUID } from '@/utils/uuid.js';

export const createAreaHandlers = ({
  areas,
  visiblePoints,
  kmlPoints,
  kmlFiles,
  loadAllKMLPoints,
  areaCalculationService,
}) => {
  const updateVisiblePoints = () => {
    const activeAreas = areas.value.filter((a) => a.visible !== false);

    if ((kmlPoints.value || []).length === 0) {
      if (
        !updateVisiblePoints._attemptedLoad &&
        Array.isArray(kmlFiles.value) &&
        kmlFiles.value.length > 0
      ) {
        updateVisiblePoints._attemptedLoad = true;
        loadAllKMLPoints()
          .then(() => {
            updateVisiblePoints();
          })
          .catch((err) => void console.warn('loadAllKMLPoints failed', err));
      }
      return;
    }

    try {
      // update visible points hook - no-op
    } catch (e) {
      void console.warn('[kml-basemap] updateVisiblePoints post-hook failed', e);
    }

    if (activeAreas.length === 0) {
      visiblePoints.value = [];
      try {
        if (typeof window !== 'undefined' && window.basePoints) {
          window.allPoints = [...window.basePoints];
          import('@/utils/marker-refresh.js')
            .then((mod) => {
              try {
                mod.refreshAllMarkers && mod.refreshAllMarkers();
              } catch (e) {
                void console.warn('[kml-basemap] updateVisiblePoints reset error', e);
              }
            })
            .catch((err) => {
              void console.warn('[kml-basemap] import marker-refresh failed', err);
            });

          try {
            if (typeof window.refreshAllMarkers === 'function') {
              window.refreshAllMarkers();
            }
          } catch (e) {
            /* ignore */
          }
        }
        if (typeof window !== 'undefined') window.kmlSelectedPoints = [];
      } catch (e) {
        void console.warn('[kml-basemap] updateVisiblePoints reset error', e);
      }
      return;
    }

    const visible = [];

    for (const point of kmlPoints.value) {
      let isVisible = false;

      for (const area of activeAreas) {
        if (area.type === 'circle') {
          if (areaCalculationService.isPointInCircle(point, area.center, area.radius)) {
            isVisible = true;
            break;
          }
        } else if (area.type === 'polygon') {
          if (areaCalculationService.isPointInPolygon(point, area.polygon)) {
            isVisible = true;
            break;
          }
        }
      }

      if (isVisible) {
        visible.push({
          ...point,
          visible: true,
        });
      }
    }

    visiblePoints.value = visible;
    try {
      /* visible points computed */
    } catch (e) {
      void console.warn('[kml-basemap] visiblePoints computation post-hook failed', e);
    }

    try {
      if (typeof window !== 'undefined') {
        if (!window.basePoints) {
          const current = Array.isArray(window.allPoints) ? window.allPoints : [];
          window.basePoints = current.filter((p) => !p.__kmlSelected);
        }

        const kmlPointsForMap = visible.map((p) => ({
          id: `kml-${p.fileId}-${p.id || p._id || Math.random().toString(36).slice(2)}`,
          latitude: p.latitude,
          longitude: p.longitude,
          lat: p.latitude,
          lng: p.longitude,
          title: p.name || p.title || 'KML点位',
          description: p.description || p.desc || p.note || '',
          wgs84_lat: p.latitude != null ? Number(p.latitude) : null,
          wgs84_lng: p.longitude != null ? Number(p.longitude) : null,
          type: 'kml',
          __kmlSelected: true,
          sourceFile: p.sourceFile,
          fileId: p.fileId,
          styleConfig:
            kmlFiles.value && Array.isArray(kmlFiles.value)
              ? kmlFiles.value.find((f) => f.id === p.fileId)?.styleConfig || null
              : null,
        }));

        window.kmlSelectedPoints = kmlPointsForMap;
        window.allPoints = [...(window.basePoints || []), ...kmlPointsForMap];

        try {
          const mapExists = typeof window !== 'undefined' && (!!window.mapInstance || !!window.map);
          void mapExists;
          setTimeout(() => {
            import('@/utils/marker-refresh.js')
              .then((mod) => {
                try {
                  mod.refreshAllMarkers && mod.refreshAllMarkers();
                } catch (e) {
                  void console.warn('[kml-basemap] refreshAllMarkers error', e);
                }
              })
              .catch((e) => {
                void console.warn('[kml-basemap] import marker-refresh failed', e);
              });
          }, 200);
        } catch (err) {
          void console.warn('[kml-basemap] schedule refresh failed', err);
        }
      }
    } catch (err) {
      void console.warn('[kml-basemap] merge visible KML points failed', err);
    }
  };

  const addArea = (area) => {
    areas.value.push({
      id: generateUUID(),
      ...area,
      visible: area.visible !== undefined ? area.visible : true,
      createdAt: new Date(),
    });
    try {
      // area added hook - no-op but keep try for parity with earlier code
    } catch (e) {
      void console.warn('[kml-basemap] addArea hook failed', e);
    }
    updateVisiblePoints();
  };

  const addCircleArea = (center, radius) => {
    try {
      // circle area pre-hook - no-op
    } catch (e) {
      void console.warn('[kml-basemap] addCircleArea pre-hook failed', e);
    }
    addArea({
      type: 'circle',
      center,
      radius,
      name: '圆形区域',
    });
  };

  const addCustomArea = (polygon, name = '自定义区域') => {
    try {
      // custom area pre-hook - no-op
    } catch (e) {
      void console.warn('[kml-basemap] addCustomArea pre-hook failed', e);
    }
    addArea({
      type: 'polygon',
      polygon,
      name,
    });
  };

  const clearAllAreas = () => {
    try {
      areas.value = [];
      visiblePoints.value = [];
      if (typeof window !== 'undefined') {
        if (window.basePoints) {
          window.allPoints = [...window.basePoints];
          import('@/utils/marker-refresh.js')
            .then((mod) => {
              try {
                mod.refreshAllMarkers && mod.refreshAllMarkers();
              } catch (e) {
                void console.warn('[kml-basemap] clearAllAreas refreshAllMarkers error', e);
              }
            })
            .catch((err) => {
              void console.warn('[kml-basemap] import marker-refresh failed', err);
            });

          try {
            if (typeof window.refreshAllMarkers === 'function') {
              window.refreshAllMarkers();
            }
          } catch (e) {
            /* ignore */
          }
        }
        window.kmlSelectedPoints = [];
      }
    } catch (err) {
      void console.warn('[kml-basemap] clearAllAreas restore basePoints failed', err);
    }
  };

  const removeArea = (areaId) => {
    areas.value = areas.value.filter((area) => area.id !== areaId);
    updateVisiblePoints();
  };

  const getPointsInArea = (areaId) => {
    const area = areas.value.find((a) => a.id === areaId);
    if (!area) return [];
    try {
      /* getPointsInArea called */
    } catch (e) {
      void console.warn('[kml-basemap] getPointsInArea hook failed', e);
    }

    return kmlPoints.value.filter((point) => {
      if (area.type === 'circle') {
        return areaCalculationService.isPointInCircle(point, area.center, area.radius);
      } else if (area.type === 'polygon') {
        return areaCalculationService.isPointInPolygon(point, area.polygon);
      }
      return false;
    });
  };

  const debugPointChecks = (thresholdMeters = 50) => {
    void debugPointChecks;
    try {
      const activeAreas = areas.value.filter((a) => a.visible !== false);
      if (!activeAreas.length) {
        return [];
      }

      const results = [];
      for (const point of kmlPoints.value) {
        const matched = visiblePoints.value.find((p) => p.id === point.id || p._id === point.id);
        let isInAny = false;
        let details = [];

        void debugPointChecks;
        for (const area of activeAreas) {
          if (area.type === 'circle') {
            const d = areaCalculationService.calculateDistance(
              point.latitude,
              point.longitude,
              area.center.latitude,
              area.center.longitude
            );
            const inside = d <= area.radius;
            details.push({
              areaId: area.id,
              type: 'circle',
              distance: Math.round(d),
              radius: Math.round(area.radius),
              inside,
            });
            if (inside) isInAny = true;
          } else if (area.type === 'polygon') {
            const inside = areaCalculationService.isPointInPolygon(point, area.polygon);
            const center = areaCalculationService.getPolygonCenter(area.polygon) || {
              latitude: 0,
              longitude: 0,
            };
            const d = areaCalculationService.calculateDistance(
              point.latitude,
              point.longitude,
              center.latitude,
              center.longitude
            );
            details.push({ areaId: area.id, type: 'polygon', distance: Math.round(d), inside });
            if (inside) isInAny = true;
          }
        }

        const mismatch = (matched && !isInAny) || (!matched && isInAny);
        if (mismatch) {
          results.push({
            pointId: point.id || point._id,
            matched: !!matched,
            isInAny,
            details,
            title: point.name || point.title,
          });
        } else {
          for (const d of details) {
            if (d.type === 'circle') {
              const delta = Math.abs(d.distance - d.radius);
              if (delta <= thresholdMeters) {
                results.push({
                  pointId: point.id || point._id,
                  matched: !!matched,
                  isNearBoundary: true,
                  delta,
                  details,
                  title: point.name || point.title,
                });
                break;
              }
            }
          }
        }
      }

      try {
        if (typeof window !== 'undefined') window.debugPointCheckResults = results;
      } catch (e) {
        /* ignore */
      }
      return results;
    } catch (err) {
      try {
        if (typeof window !== 'undefined') window.debugPointChecksError = err;
      } catch (e) {}
      return [];
    }
  };

  try {
    if (typeof window !== 'undefined') window.debugPointChecks = debugPointChecks;
  } catch (e) {
    /* ignore */
  }

  const toggleAreaVisibility = (areaId) => {
    const area = areas.value.find((a) => a.id === areaId);
    if (area) {
      area.visible = !area.visible;
      updateVisiblePoints();
    }
  };

  return {
    addArea,
    addCircleArea,
    addCustomArea,
    clearAllAreas,
    removeArea,
    updateVisiblePoints,
    getPointsInArea,
    toggleAreaVisibility,
    debugPointChecks,
  };
};
