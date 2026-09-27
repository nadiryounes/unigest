import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('web API helper', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('normalizes NEXT_PUBLIC_API_URL and attaches JWT bearer token', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test/');
    localStorage.setItem('unigest_token', 'jwt-test-token');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const module = await import('./lib');
    expect(module.API).toBe('https://api.example.test');

    const result = await module.api('/health');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/health');
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer jwt-test-token');
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('surfaces API validation messages', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: ['Champ A invalide', 'Champ B requis'] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { api } = await import('./lib');
    await expect(api('/students')).rejects.toThrow('Champ A invalide, Champ B requis');
  });
});
