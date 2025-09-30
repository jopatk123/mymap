const Logger = require('../../utils/logger');
const { ConfigService } = require('../config.service');

describe('ConfigService', () => {
  let repository;
  let broadcaster;
  let service;
  let baseConfig;

  const clone = (payload) => JSON.parse(JSON.stringify(payload));

  beforeEach(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => {});
    baseConfig = {
      pointStyles: {
        panorama: { point_color: '#2ed573' },
      },
      kmlStyles: {
        default: { point_color: '#ff7800' },
      },
      mapSettings: {
        initialView: {
          enabled: false,
          center: [100, 30],
          zoom: 12,
        },
      },
      uploadSettings: {},
    };

    repository = {
      read: jest.fn(async () => clone(baseConfig)),
      write: jest.fn(async (nextConfig) => {
        baseConfig = clone(nextConfig);
        return true;
      }),
      getConfigPath: jest.fn(() => '/tmp/app-config.json'),
    };

    broadcaster = {
      broadcastInitialView: jest.fn(() => ({ sent: 0 })),
      attach: jest.fn(),
    };

    service = new ConfigService({ repository, broadcaster });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes point styles when retrieving', async () => {
    const styles = await service.getPointStyles('panorama');
    expect(styles.cluster_enabled).toBe(false);
    expect(styles.cluster_color).toBe('#2ed573');
  });

  it('updates initial view settings and broadcasts changes', async () => {
    await service.updateInitialViewSettings({
      enabled: true,
      center: [120.12, 30.21],
      zoom: 15,
    });

    expect(repository.write).toHaveBeenCalled();
    const updatedConfig = repository.write.mock.calls[0][0];
    expect(updatedConfig.mapSettings.initialView).toMatchObject({
      enabled: true,
      center: [120.12, 30.21],
      zoom: 15,
    });
    expect(broadcaster.broadcastInitialView).toHaveBeenCalledWith({
      enabled: true,
      center: [120.12, 30.21],
      zoom: 15,
    });
  });

  it('throws when initial view payload invalid', async () => {
    await expect(
      service.updateInitialViewSettings({ enabled: true, center: ['bad'], zoom: 12 })
    ).rejects.toThrow('center 字段必须是包含两个数字的数组');
    expect(repository.write).not.toHaveBeenCalled();
  });

  it('merges incoming point style changes while normalizing cluster fields', async () => {
    await service.updatePointStyles('panorama', {
      point_color: '#abcdef',
      cluster_enabled: false,
    });

    expect(repository.write).toHaveBeenCalledTimes(1);
    const updated = repository.write.mock.calls[0][0];
    expect(updated.pointStyles.panorama).toMatchObject({
      point_color: '#abcdef',
      cluster_enabled: false,
      cluster_color: '#abcdef',
      cluster_icon_color: '#abcdef',
    });
  });

  it('reads KML styles with normalization and falls back to default', async () => {
    baseConfig.kmlStyles = {
      default: {
        point_color: '#123456',
        cluster_enabled: undefined,
      },
    };

    const styles = await service.getKmlStyles('non-existent');
    expect(styles).toEqual(
      expect.objectContaining({
        point_color: '#123456',
        cluster_enabled: false,
        cluster_color: '#123456',
      })
    );
  });

  it('throws when KML styles section missing', async () => {
    repository.read.mockResolvedValueOnce({ mapSettings: {}, pointStyles: {}, uploadSettings: {} });

    await expect(service.getKmlStyles('default')).rejects.toThrow('配置文件中缺少 kmlStyles 字段');
  });

  it('updates KML styles and logs debug info when save fails', async () => {
    const logSpy = jest.spyOn(service, 'logSaveFailureDebug').mockResolvedValue();
    repository.write.mockResolvedValueOnce(false);

    const result = await service.updateKmlStyles('default', { cluster_color: '#00ff00' });

    expect(result).toBe(false);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'updateKmlStyles',
        fileId: 'default',
        merged: expect.objectContaining({ cluster_color: '#00ff00' }),
      })
    );

    logSpy.mockRestore();
  });

  it('deletes single and multiple KML style entries when allowed', async () => {
    baseConfig.kmlStyles = {
      default: { point_color: '#ffffff' },
      1: { point_color: '#111111' },
      2: { point_color: '#222222' },
    };

    await service.deleteKmlStyles('1');
    await service.batchDeleteKmlStyles(['2', 'not-exist', 'default']);

    expect(repository.write).toHaveBeenCalledTimes(2);
    const latestConfig = repository.write.mock.calls[repository.write.mock.calls.length - 1][0];
    expect(latestConfig.kmlStyles).toEqual({
      default: { point_color: '#ffffff' },
    });
  });
});
