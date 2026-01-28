export const createMarkerHandlers = ({
  L,
  map,
  markers,
  onMarkerClick,
  markerClickDisabled,
  viewportState,
  enableViewportClipping,
  scheduleViewportUpdate,
  ensureClusterGroup,
  ensureZoomGuards,
  getPaneNameByType,
  getPointType,
  getMarkerTitle,
  getTypeStyles,
  createPointMarker,
  getDisplayCoordinates,
  viewportThreshold,
}) => {
  const isInteractionDisabled = () => Boolean(markerClickDisabled?.value);

  const addPointMarker = (point) => {
    if (!map.value) return null;

    try {
      if (viewportState.enabled && viewportState.idToMarker.has(point.id)) {
        return null;
      }
      if (window.currentMarkers && window.currentMarkers.some((m) => m.id === point.id)) {
        return null;
      }
    } catch (err) {}

    let coordinates = viewportState.coordCache.get(point.id);
    if (!coordinates) {
      coordinates = getDisplayCoordinates(point);
      if (coordinates) viewportState.coordCache.set(point.id, coordinates);
    }

    if (!coordinates) {
      void console.warn('点位坐标无效:', point);
      return null;
    }

    const [displayLng, displayLat] = coordinates;

    const pointType = getPointType(point);
    const paneName = getPaneNameByType(pointType);

    const marker = createPointMarker(
      [displayLat, displayLng],
      pointType,
      {
        title: getMarkerTitle(point, pointType),
        updateWhenZoom: false,
        pane: paneName,
      },
      point.styleConfig || null
    );

    try {
      if (String(point.id).includes('kml-')) {
        marker.on('click', (e) => {
          if (isInteractionDisabled()) {
            return;
          }
          try {
            if (L && L.DomEvent) {
              L.DomEvent.stop(e);
              if (L.DomEvent.stopPropagation) L.DomEvent.stopPropagation(e);
            }
          } catch {}
          try {
            onMarkerClick.value(point);
          } catch {}
        });
      } else if (typeof marker.getPopup === 'function' && marker.getPopup()) {
        marker.on('click', (e) => {
          if (isInteractionDisabled()) {
            return;
          }
          try {
            marker.openPopup && marker.openPopup();
          } catch (err) {}
          try {
            L.DomEvent.stopPropagation(e);
          } catch (err) {}
        });
      } else {
        marker.on('click', () => {
          if (isInteractionDisabled()) {
            return;
          }
          try {
            onMarkerClick.value(point);
          } catch (err) {}
        });
      }
    } catch (err) {}

    const styles = getTypeStyles(pointType);
    const useCluster = Boolean(styles.cluster_enabled);
    if (useCluster) {
      const group = ensureClusterGroup(pointType);
      group.addLayer(marker);
      ensureZoomGuards();
    } else {
      marker.addTo(map.value);
    }
    const markerInfo = { id: point.id, marker, type: pointType, data: point };
    markers.value.push(markerInfo);
    if (viewportState.enabled) {
      viewportState.idToMarker.set(point.id, { marker, type: pointType });
    }

    if (!window.currentMarkers) {
      window.currentMarkers = [];
    }
    window.currentMarkers.push(markerInfo);

    return marker;
  };

  const addPanoramaMarker = (panorama) => {
    return addPointMarker({ ...panorama, type: 'panorama' });
  };

  const addPanoramaMarkers = (panoramas) => {
    panoramas.forEach(addPanoramaMarker);
  };

  const addPointMarkers = (points) => {
    if (!Array.isArray(points) || points.length === 0) return;
    if (!viewportState.enabled && points.length >= viewportThreshold) {
      enableViewportClipping(points);
      return;
    }
    if (viewportState.enabled) {
      viewportState.sourcePoints = points;
      scheduleViewportUpdate();
      return;
    }
    const videoStyles = getTypeStyles('video');
    const panoStyles = getTypeStyles('panorama');
    const imageSetStyles = getTypeStyles('image-set');
    const videoClusterOn = Boolean(videoStyles.cluster_enabled);
    const panoClusterOn = Boolean(panoStyles.cluster_enabled);
    const imageSetClusterOn = Boolean(imageSetStyles.cluster_enabled);

    if (!videoClusterOn && !panoClusterOn && !imageSetClusterOn) {
      points.forEach(addPointMarker);
      return;
    }

    const batchVideo = [];
    const batchPano = [];
    const batchImageSet = [];

    for (const p of points) {
      try {
        if (viewportState.enabled && viewportState.idToMarker.has(p.id)) {
          continue;
        }
        if (window.currentMarkers && window.currentMarkers.some((m) => m.id === p.id)) {
          continue;
        }
      } catch (err) {}
      const pointType = getPointType(p);
      const paneName = getPaneNameByType(pointType);
      const coordinates = getDisplayCoordinates(p);
      if (!coordinates) continue;
      const [displayLng, displayLat] = coordinates;
      const marker = createPointMarker(
        [displayLat, displayLng],
        pointType,
        {
          title: getMarkerTitle(p, pointType),
          updateWhenZoom: false,
          pane: paneName,
        },
        p.styleConfig || null
      );
      if (String(p.id).includes('kml-')) {
        marker.on('click', (e) => {
          if (isInteractionDisabled()) {
            return;
          }
          try {
            L.DomEvent.stop(e);
            L.DomEvent.stopPropagation(e);
          } catch (err) {}
          try {
            onMarkerClick.value(p);
          } catch (err) {}
        });
      } else if (typeof marker.getPopup === 'function' && marker.getPopup()) {
        marker.on('click', (e) => {
          if (isInteractionDisabled()) {
            return;
          }
          try {
            marker.openPopup && marker.openPopup();
          } catch (err) {}
          try {
            L.DomEvent.stopPropagation(e);
          } catch (err) {}
        });
      } else {
        marker.on('click', () => {
          if (isInteractionDisabled()) {
            return;
          }
          try {
            onMarkerClick.value(p);
          } catch (err) {}
        });
      }

      const markerInfo = { id: p.id, marker, type: pointType, data: p };
      if (pointType === 'video') {
        batchVideo.push(markerInfo);
      } else if (pointType === 'image-set') {
        batchImageSet.push(markerInfo);
      } else {
        batchPano.push(markerInfo);
      }

      if (viewportState.enabled) {
        viewportState.idToMarker.set(p.id, { marker, type: pointType });
      }
    }

    if (batchVideo.length) {
      const group = ensureClusterGroup('video');
      batchVideo.forEach((m) => group.addLayer(m.marker));
    }
    if (batchImageSet.length) {
      const group = ensureClusterGroup('image-set');
      batchImageSet.forEach((m) => group.addLayer(m.marker));
    }
    if (batchPano.length) {
      const group = ensureClusterGroup('panorama');
      batchPano.forEach((m) => group.addLayer(m.marker));
    }

    ensureZoomGuards();

    markers.value.push(...batchVideo, ...batchImageSet, ...batchPano);
    if (!window.currentMarkers) {
      window.currentMarkers = [];
    }
    window.currentMarkers.push(...batchVideo, ...batchImageSet, ...batchPano);
  };

  return {
    addPointMarker,
    addPanoramaMarker,
    addPanoramaMarkers,
    addPointMarkers,
  };
};
