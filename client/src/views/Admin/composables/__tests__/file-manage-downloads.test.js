import { describe, expect, it } from 'vitest';

import {
  buildCsvContent,
  buildDownloadTasks,
  createDownloadFileName,
  inferFileExtension,
  resolveDownloadUrl,
} from '../file-manage-downloads.js';

describe('file-manage-downloads helpers', () => {
  it('resolves panorama download url with id', () => {
    const url = resolveDownloadUrl({ fileType: 'panorama', id: 42 });
    expect(url).toBe('/api/panoramas/42/download');
  });

  it('falls back to existing url when type missing', () => {
    const url = resolveDownloadUrl({ url: '/static/file.jpg' });
    expect(url).toBe('/static/file.jpg');
  });

  it('infers file extensions correctly', () => {
    expect(inferFileExtension({ fileType: 'panorama', file_type: 'image/jpeg' })).toBe('jpeg');
    expect(inferFileExtension({ fileType: 'video', file_type: 'video/mp4' })).toBe('mp4');
    expect(inferFileExtension({ fileType: 'kml' })).toBe('kml');
    expect(inferFileExtension({ fileType: 'unknown' })).toBe('');
  });

  it('creates download file names with extension', () => {
    const filename = createDownloadFileName({
      fileType: 'video',
      title: '测试文件',
      file_type: 'video/mp4',
    });
    expect(filename).toBe('测试文件.mp4');
  });

  it('builds download tasks and filters invalid ones', () => {
    const tasks = buildDownloadTasks([
      { fileType: 'panorama', id: 1, title: 'A', file_type: 'image/jpeg' },
      { title: '无链接' },
    ]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      url: '/api/panoramas/1/download',
      filename: 'A.jpeg',
    });
  });

  it('escapes csv fields and builds csv content', () => {
    const csv = buildCsvContent([
      {
        fileType: 'video',
        title: '含逗号,和"引号"',
        description: '描述',
        folder_name: '主文件夹',
        lat: 30.1234,
        lng: 120.5678,
      },
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('序号,类型,标题,描述,文件夹,经度,纬度');
    expect(lines[1]).toContain('"含逗号,和""引号"""');
    expect(lines[1]).toContain('120.5678');
  });
});
