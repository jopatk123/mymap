import L from 'leaflet';
import 'leaflet.markercluster';

// ensure leaflet side-effects are preserved for markercluster
void L;

export { GCJ02CRS, createAMapTileLayer } from './map-tiles.js';
export {
  createPanoramaMarker,
  createVideoMarker,
  createImageSetMarker,
  createPointMarker,
  createClusterIcon,
} from './marker-factories.js';
export { CoordinateConverter, calculateDistance, getPointsInBounds } from './map-geometry.js';
