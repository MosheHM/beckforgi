import request from 'supertest';
import app from '../src/app';

describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(['OK', 'DEGRADED']).toContain(response.body.status);
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('services');
    expect(response.body.services).toHaveProperty('database');
    expect(response.body.services).toHaveProperty('ai');
    expect(typeof response.body.uptime).toBe('number');
  });

  it('should return AI service health status', async () => {
    const response = await request(app)
      .get('/health/ai')
      .expect((res) => {
        // Accept both 200 (healthy) and 503 (unavailable) as valid responses
        expect([200, 503]).toContain(res.status);
      });

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('healthy');
    expect(typeof response.body.healthy).toBe('boolean');
  });
});