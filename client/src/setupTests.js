import { afterEach, vi } from 'vitest';

const createMessageSpy = () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
});

vi.mock('element-plus', () => {
  const messageApis = createMessageSpy();
  const confirm = vi.fn(() => Promise.resolve());

  return {
    ElMessage: messageApis,
    ElMessageBox: {
      confirm,
    },
    // 允许测试按需访问底层 mock
    __mocks: {
      messageApis,
      confirm,
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});
