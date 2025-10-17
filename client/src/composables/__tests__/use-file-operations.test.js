import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/panorama.js', () => ({
  deletePanorama: vi.fn(() => Promise.resolve()),
  batchMovePanoramasToFolder: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/api/video.js', () => ({
  videoApi: {
    deleteVideoPoint: vi.fn(() => Promise.resolve()),
    batchMoveVideoPointsToFolder: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/api/kml.js', () => ({
  kmlApi: {
    deleteKmlFile: vi.fn(() => Promise.resolve()),
    batchMoveKmlFilesToFolder: vi.fn(() => Promise.resolve()),
  },
}));

const bootstrap = async () => {
  const composable = await import('../use-file-operations.js');
  const elementPlus = await import('element-plus');
  const panoramaApi = await import('@/api/panorama.js');
  const videoApi = await import('@/api/video.js');
  const kmlApi = await import('@/api/kml.js');

  return {
    ...composable,
    elementPlus,
    panoramaApi,
    videoApi,
    kmlApi,
  };
};

describe('useFileOperations', () => {
  it('deletes panorama file after user confirmation', async () => {
    const {
      useFileOperations,
      elementPlus: { ElMessage, ElMessageBox },
      panoramaApi: { deletePanorama },
    } = await bootstrap();

    const { deleteFile } = useFileOperations();
    const file = { id: 101, displayType: '全景图', title: '天安门', fileType: 'panorama' };
    const onSuccess = vi.fn();

    ElMessageBox.confirm.mockResolvedValueOnce();

    await deleteFile(file, onSuccess);

    expect(deletePanorama).toHaveBeenCalledWith(101);
    expect(ElMessage.success).toHaveBeenCalledWith({ message: '删除成功', duration: 1000 });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('stops deletion when user cancels the confirmation dialog', async () => {
    const {
      useFileOperations,
      elementPlus: { ElMessage, ElMessageBox },
      panoramaApi: { deletePanorama },
    } = await bootstrap();

    const { deleteFile } = useFileOperations();
    const file = { id: 11, displayType: '全景图', title: '取消案例', fileType: 'panorama' };

    ElMessageBox.confirm.mockRejectedValueOnce('cancel');

    await deleteFile(file);

    expect(deletePanorama).not.toHaveBeenCalled();
    expect(ElMessage.error).not.toHaveBeenCalled();
  });

  it('shows error message when API deletion fails', async () => {
    const {
      useFileOperations,
      elementPlus: { ElMessage, ElMessageBox },
      panoramaApi: { deletePanorama },
    } = await bootstrap();

    const { deleteFile } = useFileOperations();
    const file = { id: 12, displayType: '全景图', title: '失败案例', fileType: 'panorama' };

    ElMessageBox.confirm.mockResolvedValueOnce();
    deletePanorama.mockRejectedValueOnce(new Error('网络异常'));

    await deleteFile(file);

    expect(ElMessage.error).toHaveBeenCalledWith({
      message: expect.stringContaining('网络异常'),
      duration: 1000,
    });
  });

  it('groups selected files by type and moves them to the target folder', async () => {
    const {
      useFileOperations,
      elementPlus: { ElMessage },
      panoramaApi: { batchMovePanoramasToFolder },
      videoApi: {
        videoApi: { batchMoveVideoPointsToFolder },
      },
      kmlApi: {
        kmlApi: { batchMoveKmlFilesToFolder },
      },
    } = await bootstrap();

    const { handleMoveConfirm, movingFiles, moveToFolderId, dialogStates } = useFileOperations();

    movingFiles.value = [
      { id: 1, fileType: 'panorama' },
      { id: 2, fileType: 'video' },
      { id: 3, fileType: 'kml' },
      { id: 4, fileType: 'panorama' },
    ];
    moveToFolderId.value = 0;
    dialogStates.showMoveDialog = true;

    const onSuccess = vi.fn();

    await handleMoveConfirm(onSuccess);

    expect(batchMovePanoramasToFolder).toHaveBeenCalledWith([1, 4], null);
    expect(batchMoveVideoPointsToFolder).toHaveBeenCalledWith([2], null);
    expect(batchMoveKmlFilesToFolder).toHaveBeenCalledWith([3], null);
    expect(ElMessage.success).toHaveBeenCalledWith({ message: '移动成功', duration: 1000 });
    expect(dialogStates.showMoveDialog).toBe(false);
    expect(movingFiles.value).toHaveLength(0);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('warns user when trying to move without any selected files', async () => {
    const {
      useFileOperations,
      elementPlus: { ElMessage },
    } = await bootstrap();

    const { handleMoveConfirm } = useFileOperations();

    await handleMoveConfirm();

    expect(ElMessage.warning).toHaveBeenCalledWith({
      message: '没有选择要移动的文件',
      duration: 1000,
    });
  });

  it('falls back to placeholder image when load fails', async () => {
    const { useFileOperations } = await bootstrap();

    const { handleImageError } = useFileOperations();
    const event = { target: { src: '' } };

    handleImageError(event);

    expect(event.target.src).toContain('data:image/svg+xml');
  });
});
