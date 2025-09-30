import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMarkerSync } from '../marker-sync.js';

vi.mock(
  '@/composables/kml-point-renderer.js',
  () => ({
    createPopupContent: vi.fn(() => '<div>popup</div>'),
  }),
  { virtual: true }
);

vi.mock(
  '@/utils/coordinate-transform.js',
  () => ({
    getDisplayCoordinates: vi.fn(() => [120.12, 30.21]),
  }),
  { virtual: true }
);

describe('createMarkerSync', () => {
  let addPointMarkers;
  let clearMarkers;
  let clearPointMarkers;
  let ensureMarkerRefreshModule;
  let onMarkerClick;
  let map;

  beforeEach(() => {
    addPointMarkers = vi.fn();
    clearMarkers = vi.fn();
    clearPointMarkers = vi.fn();
    ensureMarkerRefreshModule = vi.fn(async () => ({ setMarkersData: vi.fn() }));
    onMarkerClick = { value: null };
    map = { value: {} };
  });

  it('emits panorama-click for non-KML markers', async () => {
    const emit = vi.fn();
    const markerSync = createMarkerSync(
      {
        props: { panoramas: [] },
        emit,
        map,
        addPointMarkers,
        clearMarkers,
        clearPointMarkers,
        ensureMarkerRefreshModule,
        onMarkerClick,
      },
      {
        window: {},
        delay: () => Promise.resolve(),
        leaflet: {
          popup: vi.fn(() => ({
            setLatLng: vi.fn().mockReturnThis(),
            setContent: vi.fn().mockReturnThis(),
            openOn: vi.fn().mockReturnThis(),
          })),
        },
      }
    );

    const handler = markerSync.registerMarkerClick();
    await handler({ id: '1', type: 'panorama' });

    expect(emit).toHaveBeenCalledWith('panorama-click', expect.objectContaining({ id: '1' }));
  });

  it('opens popup for KML markers instead of emitting event', async () => {
    const emit = vi.fn();
    const popupOpen = vi.fn().mockReturnThis();
    const leaflet = {
      popup: vi.fn(() => ({
        setLatLng: vi.fn().mockReturnThis(),
        setContent: vi.fn().mockReturnThis(),
        openOn: popupOpen,
      })),
    };

    const markerSync = createMarkerSync(
      {
        props: { panoramas: [] },
        emit,
        map,
        addPointMarkers,
        clearMarkers,
        clearPointMarkers,
        ensureMarkerRefreshModule,
        onMarkerClick,
      },
      {
        window: { allKmlFiles: [] },
        delay: () => Promise.resolve(),
        leaflet,
      }
    );

    const handler = markerSync.registerMarkerClick();
    await handler({ id: 'kml-1', type: 'kml', lat: 10, lng: 20, description: 'desc' });

    expect(emit).not.toHaveBeenCalled();
    expect(leaflet.popup).toHaveBeenCalled();
    expect(popupOpen).toHaveBeenCalled();
  });

  it('refreshMarkers clears existing points and reloads panoramas', async () => {
    const emit = vi.fn();
    const markerSync = createMarkerSync(
      {
        props: { panoramas: [{ id: 1 }] },
        emit,
        map,
        addPointMarkers,
        clearMarkers,
        clearPointMarkers,
        ensureMarkerRefreshModule,
        onMarkerClick,
      },
      {
        window: {},
        delay: () => Promise.resolve(),
        leaflet: {
          popup: vi.fn(() => ({
            setLatLng: vi.fn().mockReturnThis(),
            setContent: vi.fn().mockReturnThis(),
            openOn: vi.fn().mockReturnThis(),
          })),
        },
      }
    );

    await markerSync.refreshMarkers({ delayMs: 0 });

    expect(clearPointMarkers).toHaveBeenCalled();
    expect(addPointMarkers).toHaveBeenCalledWith(expect.arrayContaining([{ id: 1 }]));
  });
});
