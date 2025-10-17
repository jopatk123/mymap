const request = require('supertest');
const app = require('../app');

describe('API routing smoke tests', () => {
  test('GET /api returns project metadata', async () => {
    const response = await request(app).get('/api').expect(200);

    expect(response.body).toMatchObject({
      code: 200,
      success: true,
      data: expect.objectContaining({
        version: expect.any(String),
        endpoints: expect.objectContaining({
          panoramas: '/api/panoramas',
        }),
      }),
    });
    expect(response.headers['cache-control']).toBe(
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
  });

  test('GET /api/health exposes runtime information', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      code: 200,
      success: true,
      data: expect.objectContaining({
        status: 'healthy',
        uptime: expect.any(Number),
      }),
    });
  });
});
