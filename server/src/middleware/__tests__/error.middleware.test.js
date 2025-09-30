const fs = require('fs');
const Logger = require('../../utils/logger');
const { notFoundHandler, errorHandler, asyncHandler } = require('../error.middleware');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('error middleware', () => {
  let mkdirSpy;
  let appendSpy;
  let loggerSpy;

  beforeEach(() => {
    mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    appendSpy = jest.spyOn(fs, 'appendFileSync').mockImplementation(() => {});
    loggerSpy = jest.spyOn(Logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mkdirSpy.mockRestore();
    appendSpy.mockRestore();
    loggerSpy.mockRestore();
  });

  it('handles not found routes with standardized payload', () => {
    const res = createResponse();
    const req = { originalUrl: '/missing' };

    notFoundHandler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('/missing') })
    );
  });

  it('maps known database and validation errors to specific HTTP codes', () => {
    const res = createResponse();
    const baseReq = { method: 'GET', originalUrl: '/api/data' };

    errorHandler({ code: 'ER_DUP_ENTRY' }, baseReq, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);

    res.status.mockClear();
    res.json.mockClear();

  errorHandler({ name: 'ValidationError', message: 'bad' }, baseReq, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);

    res.status.mockClear();
    res.json.mockClear();

  const syntaxErr = new SyntaxError('Unexpected token');
  syntaxErr.status = 400;
  syntaxErr.body = {};

  errorHandler(syntaxErr, baseReq, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('falls back to 500 for unknown errors while logging once', () => {
    const res = createResponse();
    const req = { method: 'POST', originalUrl: '/api/create' };
    const error = new Error('boom');

    errorHandler(error, req, res, jest.fn());

    expect(loggerSpy).toHaveBeenCalledWith('全局错误:', error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'boom' })
    );
  });

  it('asyncHandler forwards rejected promises to next', async () => {
    const next = jest.fn();
    const handler = asyncHandler(async () => {
      throw new Error('async failure');
    });

    await handler({}, createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
