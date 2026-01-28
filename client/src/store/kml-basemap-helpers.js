import { kmlApi } from '@/api/kml.js';

export const normalizeKmlFiles = (files) =>
  Array.isArray(files)
    ? files.map((f) => {
        if (typeof f === 'number') return { id: f };
        return f;
      })
    : [];

export const attachFileStyles = async (files) => {
  const results = [];
  for (const file of files) {
    try {
      const styleResponse = await kmlApi.getKmlFileStyles(file.id);
      results.push({ ...file, styleConfig: styleResponse.data });
    } catch (error) {
      results.push({ ...file, styleConfig: null });
    }
  }
  return results;
};

export const mapPointWithFile = (point, file) => ({
  ...point,
  sourceFile: file.name,
  fileId: file.id,
  // inherit file-level styleConfig so point-level rendering can apply KML styles
  styleConfig: file.styleConfig || null,
});
