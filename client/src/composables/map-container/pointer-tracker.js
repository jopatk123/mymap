import { ref } from 'vue';
import { throttle } from 'lodash-es';
import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';
import { elevationService } from '@/services/elevation/index.js';

function createEmptyState() {
  return {
    gcjLat: null,
    gcjLng: null,
    wgsLat: null,
    wgsLng: null,
    elevation: null,
    hasData: false,
    isLoading: false,
    tileId: null,
  };
}

export function createPointerTracker(options = {}) {
  const { map, elevationProvider = elevationService, throttleMs = 200 } = options;

  const state = ref(createEmptyState());
  let lastRequestId = 0;
  let moveHandler;
  let leaveHandler;

  const reset = () => {
    state.value = createEmptyState();
  };

  const runElevationQuery = throttle(
    async ({ lat, lng, requestId }) => {
      try {
        state.value = { ...state.value, isLoading: true };
        const result = await elevationProvider.getElevation(lat, lng);
        if (requestId !== lastRequestId) {
          return;
        }
        state.value = {
          ...state.value,
          elevation: result.elevation,
          hasData: result.hasData,
          tileId: result.tileId,
          isLoading: false,
        };
      } catch (error) {
        state.value = {
          ...state.value,
          elevation: null,
          hasData: false,
          tileId: null,
          isLoading: false,
        };
        void console.warn('Elevation lookup failed', error);
      }
    },
    throttleMs,
    { trailing: true, leading: true }
  );

  const handleMove = (event) => {
    if (!event?.latlng) return;
    const gcjLat = Number(event.latlng.lat);
    const gcjLng = Number(event.latlng.lng);
    const [wgsLng, wgsLat] = gcj02ToWgs84(gcjLng, gcjLat);
    const requestId = Date.now();
    lastRequestId = requestId;
    state.value = {
      gcjLat,
      gcjLng,
      wgsLat,
      wgsLng,
      elevation: null,
      hasData: false,
      tileId: null,
      isLoading: true,
    };
    runElevationQuery({ lat: wgsLat, lng: wgsLng, requestId });
  };

  const handleLeave = () => {
    reset();
  };

  const detach = () => {
    if (!map?.value) return;
    if (moveHandler) {
      map.value.off('mousemove', moveHandler);
      moveHandler = undefined;
    }
    if (leaveHandler) {
      map.value.off('mouseout', handleLeave);
      leaveHandler = undefined;
    }
  };

  const attach = () => {
    if (!map?.value) return;
    detach();
    moveHandler = handleMove;
    leaveHandler = handleLeave;
    map.value.on('mousemove', moveHandler);
    map.value.on('mouseout', handleLeave);
  };

  return {
    state,
    attach,
    detach,
    reset,
  };
}
