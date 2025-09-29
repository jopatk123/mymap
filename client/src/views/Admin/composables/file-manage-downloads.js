import { toRaw } from 'vue';

const TYPE_LABEL_MAP = {
  panorama: '全景图',
  video: '视频',
  kml: 'KML文件',
};

const CSV_HEADERS = ['序号', '类型', '标题', '描述', '文件夹', '经度', '纬度'];

function normalizeFile(input) {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const file = toRaw(input);
  return file ?? {};
}

export function resolveDownloadUrl(fileInput) {
  const file = normalizeFile(fileInput);
  const { fileType, id } = file;

  if (!fileType) return file.url || file.image_url || file.imageUrl || null;

  switch (fileType) {
    case 'panorama':
      if (id != null) {
        return `/api/panoramas/${id}/download`;
      }
      return file.image_url || file.imageUrl || null;
    case 'video':
      return file.video_url || null;
    case 'kml':
      return file.file_url || file.url || file.image_url || null;
    default:
      return file.url || file.image_url || null;
  }
}

export function inferFileExtension(fileInput) {
  const file = normalizeFile(fileInput);

  switch (file.fileType) {
    case 'panorama':
      return file.file_type?.split?.('/')?.[1] || 'jpg';
    case 'video':
      return file.file_type?.split?.('/')?.[1] || 'mp4';
    case 'kml':
      return 'kml';
    default:
      return '';
  }
}

export function createDownloadFileName(fileInput) {
  const file = normalizeFile(fileInput);
  const base = file.title || 'file';
  const ext = inferFileExtension(file);
  return ext ? `${base}.${ext}` : base;
}

export function buildDownloadTasks(files) {
  if (!Array.isArray(files)) return [];

  return files
    .map((item) => {
      const url = resolveDownloadUrl(item);
      if (!url) return null;
      return {
        file: normalizeFile(item),
        url,
        filename: createDownloadFileName(item),
      };
    })
    .filter(Boolean);
}

export function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function buildCsvRows(files) {
  if (!Array.isArray(files)) return [];

  return files.map((item, index) => {
    const file = normalizeFile(item);
    const typeLabel = TYPE_LABEL_MAP[file.fileType] || '未知';
    const folder = file.folder_name || file.folderName || '默认文件夹';

    const latValue = file.lat ?? file.latitude;
    const lngValue = file.lng ?? file.longitude;
    const lat = latValue !== undefined && latValue !== null ? latValue : '';
    const lng = lngValue !== undefined && lngValue !== null ? lngValue : '';

    return [
      index + 1,
      escapeCsvField(typeLabel),
      escapeCsvField(file.title || ''),
      escapeCsvField(file.description || ''),
      escapeCsvField(folder),
      escapeCsvField(lng),
      escapeCsvField(lat),
    ];
  });
}

export function buildCsvContent(files) {
  const rows = buildCsvRows(files);
  if (rows.length === 0) return CSV_HEADERS.join(',');
  const lines = rows.map((row) => row.join(','));
  return [CSV_HEADERS.join(','), ...lines].join('\r\n');
}

export function createCsvBlob(files) {
  const content = buildCsvContent(files);
  return new Blob([content], { type: 'text/csv;charset=utf-8' });
}
