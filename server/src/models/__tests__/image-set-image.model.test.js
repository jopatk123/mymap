const { withTempDatabase } = require('../../__tests__/helpers/temp-db');

describe('ImageSetImageModel database interactions', () => {
  test('create adds image to image set', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');
      const ImageSetImageModel = load('models/image-set-image.model');

      // 先创建图片集
      const imageSet = await ImageSetModel.create({
        title: '测试图片集',
        latitude: 31.2,
        longitude: 121.5,
      });

      // 添加图片
      const image = await ImageSetImageModel.create({
        imageSetId: imageSet.id,
        imageUrl: 'http://example.com/image1.jpg',
        thumbnailUrl: 'http://example.com/thumb1.jpg',
        fileName: 'image1.jpg',
        fileSize: 1024,
        fileType: 'image/jpeg',
        width: 1920,
        height: 1080,
        sortOrder: 0,
      });

      expect(image).toBeDefined();
      expect(image.id).toBeDefined();
      expect(image.image_set_id).toBe(imageSet.id);
      expect(image.image_url).toBe('http://example.com/image1.jpg');
      expect(image.file_name).toBe('image1.jpg');
    });
  });

  test('batchCreate adds multiple images', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');
      const ImageSetImageModel = load('models/image-set-image.model');

      const imageSet = await ImageSetModel.create({
        title: '批量测试',
        latitude: 31.2,
        longitude: 121.5,
      });

      const images = [
        { imageUrl: 'http://example.com/a.jpg', fileName: 'a.jpg', fileSize: 100 },
        { imageUrl: 'http://example.com/b.jpg', fileName: 'b.jpg', fileSize: 200 },
        { imageUrl: 'http://example.com/c.jpg', fileName: 'c.jpg', fileSize: 300 },
      ];

      const results = await ImageSetImageModel.batchCreate(imageSet.id, images);
      expect(results.length).toBe(3);

      // 验证排序顺序
      expect(results[0].sort_order).toBe(0);
      expect(results[1].sort_order).toBe(1);
      expect(results[2].sort_order).toBe(2);
    });
  });

  test('findByImageSetId returns all images in order', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');
      const ImageSetImageModel = load('models/image-set-image.model');

      const imageSet = await ImageSetModel.create({
        title: '排序测试',
        latitude: 31.2,
        longitude: 121.5,
      });

      // 故意乱序创建
      await ImageSetImageModel.create({
        imageSetId: imageSet.id,
        imageUrl: 'http://example.com/c.jpg',
        sortOrder: 2,
      });
      await ImageSetImageModel.create({
        imageSetId: imageSet.id,
        imageUrl: 'http://example.com/a.jpg',
        sortOrder: 0,
      });
      await ImageSetImageModel.create({
        imageSetId: imageSet.id,
        imageUrl: 'http://example.com/b.jpg',
        sortOrder: 1,
      });

      const images = await ImageSetImageModel.findByImageSetId(imageSet.id);
      expect(images.length).toBe(3);
      expect(images[0].image_url).toContain('a.jpg');
      expect(images[1].image_url).toContain('b.jpg');
      expect(images[2].image_url).toContain('c.jpg');
    });
  });

  test('delete removes single image', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');
      const ImageSetImageModel = load('models/image-set-image.model');

      const imageSet = await ImageSetModel.create({
        title: '删除测试',
        latitude: 31.2,
        longitude: 121.5,
      });

      const image = await ImageSetImageModel.create({
        imageSetId: imageSet.id,
        imageUrl: 'http://example.com/to-delete.jpg',
      });

      const deleted = await ImageSetImageModel.delete(image.id);
      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(image.id);

      const found = await ImageSetImageModel.findById(image.id);
      expect(found).toBeNull();
    });
  });

  test('deleteByImageSetId removes all images from set', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');
      const ImageSetImageModel = load('models/image-set-image.model');

      const imageSet = await ImageSetModel.create({
        title: '批量删除测试',
        latitude: 31.2,
        longitude: 121.5,
      });

      await ImageSetImageModel.batchCreate(imageSet.id, [
        { imageUrl: 'http://example.com/1.jpg' },
        { imageUrl: 'http://example.com/2.jpg' },
        { imageUrl: 'http://example.com/3.jpg' },
      ]);

      const deleted = await ImageSetImageModel.deleteByImageSetId(imageSet.id);
      expect(deleted.length).toBe(3);

      const remaining = await ImageSetImageModel.findByImageSetId(imageSet.id);
      expect(remaining.length).toBe(0);
    });
  });

  test('getImageSetStats returns correct count and size', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');
      const ImageSetImageModel = load('models/image-set-image.model');

      const imageSet = await ImageSetModel.create({
        title: '统计测试',
        latitude: 31.2,
        longitude: 121.5,
      });

      await ImageSetImageModel.batchCreate(imageSet.id, [
        { imageUrl: 'http://example.com/1.jpg', fileSize: 1000 },
        { imageUrl: 'http://example.com/2.jpg', fileSize: 2000 },
        { imageUrl: 'http://example.com/3.jpg', fileSize: 3000 },
      ]);

      const stats = await ImageSetImageModel.getImageSetStats(imageSet.id);
      expect(stats.count).toBe(3);
      expect(stats.totalSize).toBe(6000);
    });
  });

  test('batchUpdateSortOrder reorders images', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');
      const ImageSetImageModel = load('models/image-set-image.model');

      const imageSet = await ImageSetModel.create({
        title: '重排序测试',
        latitude: 31.2,
        longitude: 121.5,
      });

      const images = await ImageSetImageModel.batchCreate(imageSet.id, [
        { imageUrl: 'http://example.com/a.jpg' },
        { imageUrl: 'http://example.com/b.jpg' },
        { imageUrl: 'http://example.com/c.jpg' },
      ]);

      // 重新排序：c, a, b
      await ImageSetImageModel.batchUpdateSortOrder([
        { id: images[2].id, sortOrder: 0 },
        { id: images[0].id, sortOrder: 1 },
        { id: images[1].id, sortOrder: 2 },
      ]);

      const reordered = await ImageSetImageModel.findByImageSetId(imageSet.id);
      expect(reordered[0].image_url).toContain('c.jpg');
      expect(reordered[1].image_url).toContain('a.jpg');
      expect(reordered[2].image_url).toContain('b.jpg');
    });
  });

  test('cascade delete removes images when image set is deleted', async () => {
    await withTempDatabase(async ({ load }) => {
      const ImageSetModel = load('models/image-set.model');
      const ImageSetImageModel = load('models/image-set-image.model');

      const imageSet = await ImageSetModel.create({
        title: '级联删除测试',
        latitude: 31.2,
        longitude: 121.5,
      });

      await ImageSetImageModel.batchCreate(imageSet.id, [
        { imageUrl: 'http://example.com/1.jpg' },
        { imageUrl: 'http://example.com/2.jpg' },
      ]);

      // 删除图片集
      await ImageSetModel.delete(imageSet.id);

      // 验证图片也被删除（级联删除）
      const remaining = await ImageSetImageModel.findByImageSetId(imageSet.id);
      expect(remaining.length).toBe(0);
    });
  });
});
