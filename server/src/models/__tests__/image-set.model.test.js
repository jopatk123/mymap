const { withTempDatabase } = require('../../__tests__/helpers/temp-db');

describe('ImageSetModel database interactions', () => {
  test('create and findById work correctly', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');

      const imageSet = await ImageSetModel.create({
        title: '测试图片集',
        description: '测试描述',
        coverUrl: 'http://example.com/cover.jpg',
        thumbnailUrl: 'http://example.com/thumb.jpg',
        latitude: 31.2,
        longitude: 121.5,
        imageCount: 5,
        totalSize: 1024000,
        folderId: null,
        isVisible: true,
        sortOrder: 0,
        ownerId: null,
      });

      expect(imageSet).toBeDefined();
      expect(imageSet.id).toBeDefined();
      expect(imageSet.title).toBe('测试图片集');
      expect(imageSet.description).toBe('测试描述');
      expect(imageSet.image_count).toBe(5);
      expect(imageSet.total_size).toBe(1024000);

      // findById
      const found = await ImageSetModel.findById(imageSet.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(imageSet.id);
      expect(found.title).toBe('测试图片集');
    });
  });

  test('findAll returns paginated results', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');

      // 创建多个图片集
      for (let i = 0; i < 5; i++) {
        await ImageSetModel.create({
          title: `图片集 ${i + 1}`,
          description: `描述 ${i + 1}`,
          coverUrl: `http://example.com/cover${i}.jpg`,
          latitude: 31.2 + i * 0.01,
          longitude: 121.5 + i * 0.01,
          imageCount: i + 1,
          totalSize: (i + 1) * 1000,
        });
      }

      // 测试分页
      const result = await ImageSetModel.findAll({ page: 1, pageSize: 3 });
      expect(result.data.length).toBe(3);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(2);

      // 第二页
      const page2 = await ImageSetModel.findAll({ page: 2, pageSize: 3 });
      expect(page2.data.length).toBe(2);
    });
  });

  test('findAll supports keyword search', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');

      await ImageSetModel.create({
        title: '北京风景',
        description: '故宫照片集',
        latitude: 39.9,
        longitude: 116.4,
      });

      await ImageSetModel.create({
        title: '上海风光',
        description: '外滩风景',
        latitude: 31.2,
        longitude: 121.5,
      });

      const result = await ImageSetModel.findAll({ keyword: '北京' });
      expect(result.data.length).toBe(1);
      expect(result.data[0].title).toBe('北京风景');

      const result2 = await ImageSetModel.findAll({ keyword: '风景' });
      expect(result2.data.length).toBe(2);
    });
  });

  test('update modifies image set correctly', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');

      const imageSet = await ImageSetModel.create({
        title: '原标题',
        description: '原描述',
        latitude: 31.2,
        longitude: 121.5,
      });

      const updated = await ImageSetModel.update(imageSet.id, {
        title: '新标题',
        description: '新描述',
        isVisible: false,
      });

      expect(updated.title).toBe('新标题');
      expect(updated.description).toBe('新描述');
      expect(updated.is_visible).toBeFalsy();
    });
  });

  test('delete removes image set', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');

      const imageSet = await ImageSetModel.create({
        title: '待删除',
        latitude: 31.2,
        longitude: 121.5,
      });

      const deleted = await ImageSetModel.delete(imageSet.id);
      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(imageSet.id);

      const found = await ImageSetModel.findById(imageSet.id);
      expect(found).toBeNull();
    });
  });

  test('batchDelete removes multiple image sets', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');

      const ids = [];
      for (let i = 0; i < 3; i++) {
        const imageSet = await ImageSetModel.create({
          title: `图片集 ${i}`,
          latitude: 31.2,
          longitude: 121.5,
        });
        ids.push(imageSet.id);
      }

      const deleted = await ImageSetModel.batchDelete(ids);
      expect(deleted.length).toBe(3);

      for (const id of ids) {
        const found = await ImageSetModel.findById(id);
        expect(found).toBeNull();
      }
    });
  });

  test('batchUpdateVisibility updates visibility for multiple image sets', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');

      const ids = [];
      for (let i = 0; i < 3; i++) {
        const imageSet = await ImageSetModel.create({
          title: `图片集 ${i}`,
          latitude: 31.2,
          longitude: 121.5,
          isVisible: true,
        });
        ids.push(imageSet.id);
      }

      const updated = await ImageSetModel.batchUpdateVisibility(ids, false);
      expect(updated.length).toBe(3);
      updated.forEach((item) => {
        expect(item.is_visible).toBeFalsy();
      });
    });
  });

  test('findByBounds returns image sets within bounds', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');

      // 创建带坐标的图片集
      await ImageSetModel.create({
        title: '在范围内',
        latitude: 31.2,
        longitude: 121.5,
      });

      await ImageSetModel.create({
        title: '在范围外',
        latitude: 40.0,
        longitude: 116.0,
      });

      const result = await ImageSetModel.findByBounds({
        north: 32,
        south: 30,
        east: 122,
        west: 121,
      });

      expect(result.length).toBe(1);
      expect(result[0].title).toBe('在范围内');
    });
  });

  test('getStats returns correct statistics', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');

      await ImageSetModel.create({
        title: '图片集1',
        latitude: 31.2,
        longitude: 121.5,
        imageCount: 5,
        totalSize: 1000,
      });

      await ImageSetModel.create({
        title: '图片集2',
        latitude: 31.2,
        longitude: 121.5,
        imageCount: 10,
        totalSize: 2000,
      });

      const stats = await ImageSetModel.getStats();
      expect(stats.total).toBe(2);
      expect(stats.totalImages).toBe(15);
      expect(stats.totalSize).toBe(3000);
    });
  });
});
