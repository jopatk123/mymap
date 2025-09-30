const Joi = require('joi');
const {
  createValidator,
  validateId,
  validateBatchIds,
  validateBatchMoveParams,
  validateBoundsParams,
} = require('../validator.middleware');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('validator middleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createValidator', () => {
    it('strips unknown fields and forwards sanitized payload', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });
      const validator = createValidator(schema, 'body');
      const req = { body: { name: '地图', extra: 'remove me' } };
      const res = mockResponse();
      const next = jest.fn();

      validator(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body).toEqual({ name: '地图' });
    });

    it('returns aggregated validation errors when schema fails', () => {
      const schema = Joi.object({
        requiredField: Joi.string().required(),
      });
      const validator = createValidator(schema, 'body');
      const req = { body: {} };
      const res = mockResponse();
      const next = jest.fn();

      validator(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          data: expect.objectContaining({
            errors: [expect.objectContaining({ field: 'requiredField' })],
          }),
        })
      );
    });
  });

  describe('validateId', () => {
    it('rejects invalid identifiers', () => {
      const req = { params: { id: 'abc' } };
      const res = mockResponse();
      const next = jest.fn();

      validateId(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errors: [expect.objectContaining({ message: 'ID必须是正整数' })],
          }),
        })
      );
    });

    it('passes through valid numeric identifiers', () => {
      const req = { params: { id: '42' } };
      const res = mockResponse();
      const next = jest.fn();

      validateId(req, res, next);

      expect(req.params.id).toBe(42);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateBatchIds', () => {
    it('rejects payloads without a non-empty ids array', () => {
      const req = { body: { ids: [] } };
      const res = mockResponse();
      const next = jest.fn();

      validateBatchIds(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects arrays containing invalid identifiers', () => {
      const req = { body: { ids: ['1', 'oops', 0] } };
      const res = mockResponse();
      const next = jest.fn();

      validateBatchIds(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({ field: 'ids[1]' }),
              expect.objectContaining({ field: 'ids[2]' }),
            ]),
          }),
        })
      );
    });

    it('normalizes valid ids and forwards request', () => {
      const req = { body: { ids: ['1', 2, '03'] } };
      const res = mockResponse();
      const next = jest.fn();

      validateBatchIds(req, res, next);

      expect(req.body.ids).toEqual([1, 2, 3]);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateBatchMoveParams', () => {
    it('rejects invalid folderId values', () => {
      const req = { body: { ids: [1], folderId: -5 } };
      const res = mockResponse();
      const next = jest.fn();

      validateBatchMoveParams(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errors: [expect.objectContaining({ field: 'folderId' })],
          }),
        })
      );
    });

    it('rejects invalid ids inside payload', () => {
      const req = { body: { ids: [1, 'bad'], folderId: 2 } };
      const res = mockResponse();
      const next = jest.fn();

      validateBatchMoveParams(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('accepts valid ids and coerces folderId to integer', () => {
      const req = { body: { ids: ['1', '2'], folderId: '7' } };
      const res = mockResponse();
      const next = jest.fn();

      validateBatchMoveParams(req, res, next);

      expect(req.body.ids).toEqual([1, 2]);
      expect(req.body.folderId).toBe(7);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('treats missing folderId as null and allows null explicitly', () => {
      const reqWithout = { body: { ids: [1] } };
      const res1 = mockResponse();
      const next1 = jest.fn();
      validateBatchMoveParams(reqWithout, res1, next1);
      expect(reqWithout.body.folderId).toBeNull();
      expect(next1).toHaveBeenCalledTimes(1);

      const reqNull = { body: { ids: [2], folderId: null } };
      const res2 = mockResponse();
      const next2 = jest.fn();
      validateBatchMoveParams(reqNull, res2, next2);
      expect(reqNull.body.folderId).toBeNull();
      expect(next2).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateBoundsParams', () => {
    it('rejects invalid geographic bounds', () => {
      const req = { query: { north: 10, south: 20, east: 30, west: 0 } };
      const res = mockResponse();
      const next = jest.fn();

      validateBoundsParams(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errors: [expect.objectContaining({ message: '北边界必须大于南边界' })],
          }),
        })
      );
    });

    it('passes through valid bounds and normalizes numbers', () => {
      const req = { query: { north: '40', south: '30', east: '120', west: '110' } };
      const res = mockResponse();
      const next = jest.fn();

      validateBoundsParams(req, res, next);

      expect(req.query).toEqual({ north: 40, south: 30, east: 120, west: 110 });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
