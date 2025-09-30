const {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
} = require('../response');

const expectTimestamp = (value) => {
  expect(value).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
};

describe('response helpers', () => {
  it('creates standardized success payloads', () => {
    const payload = successResponse({ item: 1 }, 'ok', 201);

    expect(payload).toMatchObject({
      code: 201,
      success: true,
      message: 'ok',
      data: { item: 1 },
    });
    expectTimestamp(payload.timestamp);
  });

  it('creates standardized error payloads', () => {
    const payload = errorResponse('bad', 400, { reason: 'oops' });

    expect(payload).toMatchObject({
      code: 400,
      success: false,
      message: 'bad',
      data: { reason: 'oops' },
    });
    expectTimestamp(payload.timestamp);
  });

  it('wraps data into paginated structure using success helper', () => {
    const items = [{ id: 1 }];
    const pagination = { page: 1, pageSize: 10, total: 20 };

    const payload = paginatedResponse(items, pagination, 'done');

    expect(payload).toMatchObject({
      code: 200,
      success: true,
      message: 'done',
      data: {
        list: items,
        pagination,
      },
    });
    expectTimestamp(payload.timestamp);
  });

  it('wraps validation errors with 400 status', () => {
    const payload = validationErrorResponse([{ field: 'name', message: 'required' }]);

    expect(payload).toMatchObject({
      code: 400,
      success: false,
      message: '参数验证失败',
      data: {
        errors: [{ field: 'name', message: 'required' }],
      },
    });
    expectTimestamp(payload.timestamp);
  });
});
