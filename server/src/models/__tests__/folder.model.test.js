const { withTempDatabase } = require('../../__tests__/helpers/temp-db');

describe('FolderModel database interactions', () => {
  test('create builds hierarchical tree and path resolutions', async () => {
    await withTempDatabase(async ({ load }) => {
      const FolderModel = load('models/folder.model');

      const parent = await FolderModel.create({ name: '父目录', sortOrder: 5 });
      const child = await FolderModel.create({
        name: '子目录',
        parentId: parent.id,
        isVisible: false,
      });

      const tree = await FolderModel.findAll();
      const fetchedParent = tree.find((node) => node.id === parent.id);
      expect(fetchedParent).toBeDefined();
      expect(fetchedParent.children).toBeDefined();
      expect(fetchedParent.children[0]).toMatchObject({
        id: child.id,
        parent_id: parent.id,
        is_visible: false,
      });

      const path = await FolderModel.getPath(child.id);
      expect(path.map((item) => item.id)).toEqual([parent.id, child.id]);
    });
  });

  test('delete prevents removing folders with children or related content', async () => {
    await withTempDatabase(async ({ load }) => {
      const FolderModel = load('models/folder.model');
      const SQLiteAdapter = load('utils/sqlite-adapter');

      const parent = await FolderModel.create({ name: '父级', sortOrder: 1 });
      await FolderModel.create({ name: '子级', parentId: parent.id });

      await expect(FolderModel.delete(parent.id)).rejects.toThrow('无法删除包含子文件夹的文件夹');

      const standalone = await FolderModel.create({ name: '独立', sortOrder: 2 });

      await SQLiteAdapter.execute(
        `INSERT INTO panoramas (
          title, description, image_url, thumbnail_url,
          latitude, longitude, gcj02_lat, gcj02_lng,
          file_size, file_type, folder_id, is_visible, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          '测试全景',
          null,
          'http://example.com/pano.jpg',
          null,
          31.2,
          121.5,
          null,
          null,
          null,
          null,
          standalone.id,
          true,
          0,
        ]
      );

      await expect(FolderModel.delete(standalone.id)).rejects.toThrow('无法删除包含全景图的文件夹');
    });
  });

  test('visibility helpers respect ancestor visibility', async () => {
    await withTempDatabase(async ({ load }) => {
      const FolderModel = load('models/folder.model');

      const parent = await FolderModel.create({ name: '可见父级', isVisible: true });
      const hiddenParent = await FolderModel.create({ name: '隐藏父级', isVisible: false });
      const childOfVisible = await FolderModel.create({
        name: '子文件夹A',
        parentId: parent.id,
        isVisible: true,
      });
      await FolderModel.create({
        name: '子文件夹B',
        parentId: hiddenParent.id,
        isVisible: true,
      });

      const visibleIds = await FolderModel.getVisibleFolderIds();
      expect(visibleIds).toEqual(expect.arrayContaining([parent.id, childOfVisible.id]));
      expect(visibleIds).not.toContain(hiddenParent.id);

      const isVisible = await FolderModel.isFolderVisible(childOfVisible.id);
      const isHidden = await FolderModel.isFolderVisible(hiddenParent.id);
      expect(isVisible).toBe(true);
      expect(isHidden).toBe(false);
    });
  });
});
