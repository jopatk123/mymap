import L from 'leaflet';

// Simple HTML escape to avoid injection in popups
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(
    /[&<>"'`]/g,
    (s) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;',
      }[s])
  );
}

export function useSearchMarker(mapRef) {
  let searchMarker = null;

  const setSearchMarker = (lat, lng, labelOrPoint) => {
    if (searchMarker) {
      try {
        mapRef.value.removeLayer(searchMarker);
      } catch {}
      searchMarker = null;
    }

    searchMarker = L.marker([lat, lng], {
      title: typeof labelOrPoint === 'string' ? labelOrPoint : labelOrPoint?.name || '搜索位置',
    });
    searchMarker.addTo(mapRef.value);

    if (labelOrPoint && typeof labelOrPoint === 'object') {
      const point = labelOrPoint;
      const name = point.name || '';
      const desc = point.description || '';
      const source = point.sourceFile || '';
      const latStr = Number(point.latitude ?? lat).toFixed(6);
      const lngStr = Number(point.longitude ?? lng).toFixed(6);

      const amapUrl = `https://uri.amap.com/marker?position=${lngStr},${latStr}&name=${encodeURIComponent(
        name
      )}`;
      const baiduUrl = `https://api.map.baidu.com/marker?location=${latStr},${lngStr}&title=${encodeURIComponent(
        name
      )}&content=${encodeURIComponent(source)}&coord_type=bd09ll&output=html`;

      const popupHtml = `
        <div style="max-width: 240px;">
          <h4 class="popup-title">${escapeHtml(name)}</h4>
          <p class="popup-meta">${escapeHtml(desc)} ${
        source ? '<span class="popup-source">[' + escapeHtml(source) + ']</span>' : ''
      }</p>
          <p class="popup-meta">经纬度(WGS84): ${latStr}, ${lngStr}</p>
          <div class="popup-actions">
            <a class="map-btn gaode" href="${amapUrl}" target="_blank" rel="noopener">在高德地图打开</a>
            <a class="map-btn baidu" href="${baiduUrl}" target="_blank" rel="noopener">在百度地图打开</a>
          </div>
        </div>
      `;

      searchMarker.bindPopup(popupHtml, { autoClose: true, closeOnClick: true }).openPopup();
    } else {
      const label =
        typeof labelOrPoint === 'string'
          ? labelOrPoint
          : (labelOrPoint && labelOrPoint?.name) || '搜索位置';
      searchMarker.bindPopup(label, { autoClose: true, closeOnClick: true }).openPopup();
    }
  };

  const clearSearchMarker = () => {
    if (mapRef.value && searchMarker) {
      try {
        mapRef.value.removeLayer(searchMarker);
      } catch {}
    }
    searchMarker = null;
  };

  return {
    setSearchMarker,
    clearSearchMarker,
  };
}
