export function isBasemapKml(kmlFile) {
  return Boolean(
    kmlFile?.isBasemap === true ||
      kmlFile?.is_basemap === 1 ||
      kmlFile?.is_basemap === true ||
      kmlFile?.isBasemap === 1
  );
}
