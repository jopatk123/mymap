import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ImageSetUploadArea from '../common/ImageSetUploadArea.vue';
import ElementPlus from 'element-plus';

// Mock Element Plus 组件
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});

describe('ImageSetUploadArea', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders upload area correctly', () => {
    const wrapper = mount(ImageSetUploadArea, {
      global: {
        plugins: [ElementPlus],
      },
    });

    expect(wrapper.find('.image-set-upload-area').exists()).toBe(true);
    // 组件使用 picture-card 模式，显示 Plus 图标而非文字提示
    expect(wrapper.find('.upload-area').exists()).toBe(true);
  });

  it('has correct default props', () => {
    const wrapper = mount(ImageSetUploadArea, {
      global: {
        plugins: [ElementPlus],
      },
    });

    expect(wrapper.props('maxCount')).toBe(50);
    expect(wrapper.props('maxSize')).toBe(50 * 1024 * 1024);
  });

  it('emits files-change event when files are added', async () => {
    const wrapper = mount(ImageSetUploadArea, {
      global: {
        plugins: [ElementPlus],
      },
    });

    // 模拟文件选择
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockFileList = [
      {
        uid: '1',
        raw: mockFile,
        name: 'test.jpg',
        size: 1000,
        type: 'image/jpeg',
      },
    ];

    // 直接调用 handleChange
    await wrapper.vm.handleChange(mockFileList[0], mockFileList);

    // 检查事件发射
    expect(wrapper.emitted()['files-change']).toBeTruthy();
  });

  it('exposes clear and getFiles methods', () => {
    const wrapper = mount(ImageSetUploadArea, {
      global: {
        plugins: [ElementPlus],
      },
    });

    expect(typeof wrapper.vm.clear).toBe('function');
    expect(typeof wrapper.vm.getFiles).toBe('function');
  });

  it('validates file type', async () => {
    const wrapper = mount(ImageSetUploadArea, {
      global: {
        plugins: [ElementPlus],
      },
    });

    // 无效文件类型
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const isValid = wrapper.vm.validateFile(invalidFile);
    expect(isValid).toBe(false);

    // 有效文件类型
    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const isValidJpg = wrapper.vm.validateFile(validFile);
    expect(isValidJpg).toBe(true);
  });
});
