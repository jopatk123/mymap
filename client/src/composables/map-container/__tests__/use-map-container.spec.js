import { describe, expect, it, vi } from 'vitest';
import { effectScope, reactive, ref } from 'vue';

vi.mock(
  '@/store/app.js',
  () => ({
    useAppStore: vi.fn(),
  }),
  { virtual: true }
);

vi.mock(
  '@/composables/use-map.js',
  () => ({
    useMap: vi.fn(),
  }),
  { virtual: true }
);

vi.mock(
  '@/composables/use-search-marker.js',
  () => ({
    useSearchMarker: () => ({
      setSearchMarker: vi.fn(),
      clearSearchMarker: vi.fn(),
    }),
  }),
  { virtual: true }
);

vi.mock(
  '@/utils/style-events.js',
  () => ({
    addStyleListener: vi.fn(),
    removeStyleListener: vi.fn(),
    addRefreshListener: vi.fn(),
    removeRefreshListener: vi.fn(),
  }),
  { virtual: true }
);

vi.mock(
  '@/composables/use-initial-view-sync.js',
  () => ({
    useInitialViewSync: () => ({ setup: () => vi.fn() }),
  }),
  { virtual: true }
);

import { useMapContainer } from '../../use-map-container.js';
import { createGeolocationController } from '../geolocation.js';

describe('useMapContainer', () => {
  const createUseMapStub = () => {
    const mapInstance = {
      on: vi.fn(),
      off: vi.fn(),
    };
    const map = ref(mapInstance);
    return {
      map,
      isLoading: ref(false),
      initMap: vi.fn(async () => mapInstance),
      changeMapType: vi.fn(),
      addPanoramaMarkers: vi.fn(),
      addPointMarkers: vi.fn(),
      addKmlLayers: vi.fn(),
      clearMarkers: vi.fn(),
      clearPointMarkers: vi.fn(),
      clearKmlLayers: vi.fn(),
      fitBounds: vi.fn(),
      setCenter: vi.fn(),
      onMarkerClick: ref(null),
    };
  };

  it('updates store when map type changes', () => {
    const store = reactive({
      mapSettings: reactive({ mapType: 'normal' }),
      updateMapSettings: vi.fn((payload) => {
        store.mapSettings = reactive({ ...store.mapSettings, ...payload });
      }),
    });

    const useMapStub = createUseMapStub();
    const scope = effectScope();
    let api;
    scope.run(() => {
      api = useMapContainer({ panoramas: [], center: [0, 0], zoom: 10 }, vi.fn(), {
        useAppStore: () => store,
        useMap: () => useMapStub,
        importMarkerRefresh: () => Promise.resolve({ setMapInstance: vi.fn() }),
        useSearchMarker: () => ({ setSearchMarker: vi.fn(), clearSearchMarker: vi.fn() }),
        window: {},
      });
    });

    api.handleMapTypeChange('satellite');
    expect(store.updateMapSettings).toHaveBeenCalledWith({ mapType: 'satellite' });

    store.updateMapSettings.mockClear();
    api.handleMapTypeChange('satellite');
    expect(store.updateMapSettings).not.toHaveBeenCalled();

    scope.stop();
  });
});

describe('createGeolocationController', () => {
  it('notifies warning when geolocation is unavailable', () => {
    const warning = vi.fn();
    const controller = createGeolocationController({
      setCenter: vi.fn(),
      ElMessage: { warning, error: vi.fn(), success: vi.fn() },
      navigatorRef: undefined,
    });

    controller.locateUser();

    expect(warning).toHaveBeenCalled();
    expect(controller.locating.value).toBe(false);
  });
});
