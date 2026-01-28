export function createViewportIndexWorker({ onIndexBuilt, onError }) {
  try {
    const workerCode = `
      self.onmessage = function(e) {
        const msg = e.data;
        if (!msg || msg.type !== 'buildIndex') return;
        const points = msg.points || [];
        const cellSize = msg.cellSizeDeg || 0.05;
        const index = Object.create(null);
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          try {
            const coords = p && p.wgs84_lng != null && p.wgs84_lat != null ? [p.wgs84_lng, p.wgs84_lat] : (p && p.coordinates ? (Array.isArray(p.coordinates) ? p.coordinates : null) : null);
            if (!coords) continue;
            const lng = coords[0]; const lat = coords[1];
            if (!isFinite(lng) || !isFinite(lat)) continue;
            const x = Math.floor(lng / cellSize);
            const y = Math.floor(lat / cellSize);
            const key = x + ':' + y;
            if (!index[key]) index[key] = [];
            index[key].push(p);
          } catch (err) { /* skip bad point */ }
        }
        self.postMessage({ type: 'indexBuilt', index });
      };
      `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = (ev) => {
      const msg = ev.data;
      if (!msg) return;
      if (msg.type === 'indexBuilt') {
        try {
          onIndexBuilt?.(msg.index || {});
        } catch (err) {
          try {
            console.warn('Failed to apply spatial index from worker', err);
          } catch {}
        }
      }
    };
    worker.onerror = (err) => {
      try {
        onError?.(err);
      } catch {}
    };
    return worker;
  } catch (err) {
    try {
      console.warn('Failed to create index worker', err);
    } catch {}
    return null;
  }
}
