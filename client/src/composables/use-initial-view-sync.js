// Handles applying and syncing initial view (center/zoom) via window events and localStorage

export function useInitialViewSync(setCenter) {
  let onInitialViewUpdated = null;

  const setup = () => {
    // Listen to custom event when settings saved
    onInitialViewUpdated = (e) => {
      try {
        const s = e?.detail || null;
        if (!s || !s.enabled) return;
        const [lng, lat] = s.center || [];
        if (lat == null || lng == null) return;
        setCenter(lat, lng, s.zoom);
      } catch {}
    };
    window.addEventListener('initial-view-updated', onInitialViewUpdated);

    // Fallback: read latest from localStorage
    try {
      const raw = localStorage.getItem('initial-view-updated');
      if (raw) {
        try {
          const marker = JSON.parse(raw);
          if (marker && marker.enabled) {
            const [lng, lat] = marker.center || [];
            if (lat != null && lng != null) {
              try {
                if (typeof setCenter === 'function') {
                  setCenter(lat, lng, marker.zoom);
                } else {
                  setTimeout(() => {
                    try {
                      if (typeof setCenter === 'function') {
                        setCenter(lat, lng, marker.zoom);
                      }
                    } catch {}
                  }, 60);
                }
              } catch {}
            }
          }
        } catch (err) {
          console.warn('[initial-view-sync] parse localStorage failed:', err);
        }
      }
    } catch {}

    // storage event for cross-tab sync
    const handleStorage = (e) => {
      try {
        if (!e || !e.key) return;
        if (e.key !== 'initial-view-updated') return;
        const marker = JSON.parse(e.newValue || e.oldValue || '{}');
        if (marker && marker.enabled) {
          const [lng, lat] = marker.center || [];
          if (lat != null && lng != null) {
            try {
              if (typeof setCenter === 'function') {
                setCenter(lat, lng, marker.zoom);
              } else {
                setTimeout(() => {
                  try {
                    if (typeof setCenter === 'function') {
                      setCenter(lat, lng, marker.zoom);
                    }
                  } catch {}
                }, 60);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('[initial-view-sync] handleStorage error:', err);
      }
    };
    window.addEventListener('storage', handleStorage);

    // Return a cleanup fn to remove listeners
    return () => {
      try {
        window.removeEventListener('initial-view-updated', onInitialViewUpdated);
      } catch {}
      try {
        window.removeEventListener('storage', handleStorage);
      } catch {}
    };
  };

  return { setup };
}
