import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ImageSetViewer from '../common/ImageSetViewer.vue';

// Mock API
vi.mock('@/api/image-set.js', () => ({
  imageSetApi: {
    getImageSet: vi.fn().mockResolvedValue({
      data: { success: true, data: {} },
    }),
  },
}));

// Mock 图片集数据
const mockImageSet = {
  id: 1,
  title: '测试图片集',
  description: '测试描述',
  cover_url: '/uploads/image-sets/cover.jpg',
  thumbnail_url: '/uploads/image-sets/thumb.jpg',
  latitude: 31.23,
  longitude: 121.47,
  image_count: 3,
  images: [
    {
      id: 1,
      image_url: '/uploads/image-sets/img1.jpg',
      thumbnail_url: '/uploads/image-sets/thumb1.jpg',
      file_name: 'img1.jpg',
      sort_order: 0,
    },
    {
      id: 2,
      image_url: '/uploads/image-sets/img2.jpg',
      thumbnail_url: '/uploads/image-sets/thumb2.jpg',
      file_name: 'img2.jpg',
      sort_order: 1,
    },
    {
      id: 3,
      image_url: '/uploads/image-sets/img3.jpg',
      thumbnail_url: '/uploads/image-sets/thumb3.jpg',
      file_name: 'img3.jpg',
      sort_order: 2,
    },
  ],
};

// Element Plus stub components
const stubs = {
  'el-dialog': {
    template: '<div class="el-dialog-stub"><slot></slot><slot name="footer"></slot></div>',
    props: ['modelValue', 'title', 'width', 'fullscreen', 'destroyOnClose'],
  },
  'el-icon': { template: '<span class="el-icon-stub"><slot></slot></span>' },
  'el-button': { template: '<button class="el-button-stub"><slot></slot></button>' },
  'el-button-group': { template: '<div class="el-button-group-stub"><slot></slot></div>' },
  Picture: { template: '<span></span>' },
  ArrowLeft: { template: '<span></span>' },
  ArrowRight: { template: '<span></span>' },
  Download: { template: '<span></span>' },
};

describe('ImageSetViewer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const wrapper = mount(ImageSetViewer, {
      props: {
        modelValue: true,
        initialImageSet: mockImageSet,
      },
      global: {
        stubs,
      },
    });

    expect(wrapper.find('.el-dialog-stub').exists()).toBe(true);
  });

  it('emits update:modelValue when closed', async () => {
    const wrapper = mount(ImageSetViewer, {
      props: {
        modelValue: true,
        initialImageSet: mockImageSet,
      },
      global: {
        stubs,
      },
    });

    // 调用关闭方法
    await wrapper.vm.handleClose();

    expect(wrapper.emitted()['update:modelValue']).toBeTruthy();
    expect(wrapper.emitted()['update:modelValue'][0]).toEqual([false]);
  });

  it('has correct initial state', () => {
    const wrapper = mount(ImageSetViewer, {
      props: {
        modelValue: true,
        initialImageSet: mockImageSet,
      },
      global: {
        stubs,
      },
    });

    // 检查初始索引
    expect(wrapper.vm.currentIndex).toBe(0);
    expect(wrapper.vm.isFullscreen).toBe(false);
  });

  it('navigates to next image', async () => {
    const wrapper = mount(ImageSetViewer, {
      props: {
        modelValue: true,
        initialImageSet: mockImageSet,
      },
      global: {
        stubs,
      },
    });

    // 初始状态先加载图片
    wrapper.vm.images = mockImageSet.images;

    expect(wrapper.vm.currentIndex).toBe(0);

    await wrapper.vm.nextImage();
    expect(wrapper.vm.currentIndex).toBe(1);

    await wrapper.vm.nextImage();
    expect(wrapper.vm.currentIndex).toBe(2);

    // 到最后一张后不会循环
    await wrapper.vm.nextImage();
    expect(wrapper.vm.currentIndex).toBe(2); // stays at last
  });

  it('navigates to previous image', async () => {
    const wrapper = mount(ImageSetViewer, {
      props: {
        modelValue: true,
        initialImageSet: mockImageSet,
      },
      global: {
        stubs,
      },
    });

    // 初始状态先加载图片并设置索引
    wrapper.vm.images = mockImageSet.images;
    wrapper.vm.currentIndex = 2;

    await wrapper.vm.prevImage();
    expect(wrapper.vm.currentIndex).toBe(1);

    await wrapper.vm.prevImage();
    expect(wrapper.vm.currentIndex).toBe(0);

    // 到第一张后不会往前
    await wrapper.vm.prevImage();
    expect(wrapper.vm.currentIndex).toBe(0); // stays at first
  });

  it('goes to specific image', async () => {
    const wrapper = mount(ImageSetViewer, {
      props: {
        modelValue: true,
        initialImageSet: mockImageSet,
      },
      global: {
        stubs,
      },
    });

    wrapper.vm.images = mockImageSet.images;

    await wrapper.vm.goToImage(2);
    expect(wrapper.vm.currentIndex).toBe(2);

    await wrapper.vm.goToImage(0);
    expect(wrapper.vm.currentIndex).toBe(0);
  });

  it('toggles fullscreen mode', async () => {
    const wrapper = mount(ImageSetViewer, {
      props: {
        modelValue: true,
        initialImageSet: mockImageSet,
      },
      global: {
        stubs,
      },
    });

    expect(wrapper.vm.isFullscreen).toBe(false);

    await wrapper.vm.toggleFullscreen();
    expect(wrapper.vm.isFullscreen).toBe(true);

    await wrapper.vm.toggleFullscreen();
    expect(wrapper.vm.isFullscreen).toBe(false);
  });

  it('computes currentImage correctly', async () => {
    const wrapper = mount(ImageSetViewer, {
      props: {
        modelValue: true,
        initialImageSet: mockImageSet,
      },
      global: {
        stubs,
      },
    });

    wrapper.vm.images = mockImageSet.images;
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.currentImage).toEqual(mockImageSet.images[0]);

    wrapper.vm.currentIndex = 1;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.currentImage).toEqual(mockImageSet.images[1]);
  });

  it('handles empty imageSet gracefully', () => {
    const wrapper = mount(ImageSetViewer, {
      props: {
        modelValue: true,
        initialImageSet: null,
      },
      global: {
        stubs,
      },
    });

    // 不应抛出错误
    expect(wrapper.vm.currentImage).toBeNull();
    expect(wrapper.vm.images).toEqual([]);
  });
});
