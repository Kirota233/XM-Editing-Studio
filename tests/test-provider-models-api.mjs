import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { handleApi } from '../app/server/api-plugin.mjs';

function mockReqRes(url, body) {
  const req = new EventEmitter();
  req.url = url;
  req.method = 'POST';
  req.headers = { host: '127.0.0.1:41123', origin: 'http://127.0.0.1:41123' };

  let statusCode = 200;
  let headers = {};
  let responseData = '';
  const res = {
    statusCode: 200,
    setHeader(k, v) {
      headers[k] = v;
    },
    writeHead(status, h) {
      this.statusCode = status;
      if (h) Object.assign(headers, h);
    },
    end(data) {
      responseData = data;
    },
  };

  const dispatch = async () => {
    const p = handleApi(req, res);
    process.nextTick(() => {
      req.emit('data', Buffer.from(JSON.stringify(body)));
      req.emit('end');
    });
    await p;
  };

  return {
    dispatch,
    getResponse: () => ({ status: statusCode, body: JSON.parse(responseData || '{}') }),
  };
}

test('/api/providers/models fetches and filters Gemini models with generateContent', async () => {
  const origFetch = globalThis.fetch;
  try {
    let capturedUrl = '';
    let capturedHeaders = {};
    globalThis.fetch = async (url, opts) => {
      capturedUrl = String(url);
      capturedHeaders = opts.headers || {};
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({
          models: [
            { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
          ],
        }),
      };
    };

    const { dispatch, getResponse } = mockReqRes('/api/providers/models', {
      provider: {
        id: 'gemini-1',
        protocol: 'gemini',
        apiKey: 'test-gemini-key',
      },
    });

    await dispatch();
    const result = getResponse();
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.ok(capturedUrl.includes('generativelanguage.googleapis.com'));
    assert.equal(capturedHeaders['x-goog-api-key'], 'test-gemini-key');
    // text-embedding-004 must be filtered out, models/ prefix removed, sorted
    assert.deepEqual(result.body.models, ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-flash']);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('/api/providers/models fetches OpenAI-compatible models with Bearer token', async () => {
  const origFetch = globalThis.fetch;
  try {
    let capturedUrl = '';
    let capturedHeaders = {};
    globalThis.fetch = async (url, opts) => {
      capturedUrl = String(url);
      capturedHeaders = opts.headers || {};
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({
          data: [
            { id: 'gpt-3.5-turbo' },
            { id: 'gpt-4o' },
            { id: 'o3-mini' },
          ],
        }),
      };
    };

    const { dispatch, getResponse } = mockReqRes('/api/providers/models', {
      provider: {
        id: 'custom-1',
        protocol: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
      },
    });

    await dispatch();
    const result = getResponse();
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.ok(capturedUrl.startsWith('https://api.openai.com/v1/models'));
    assert.equal(capturedHeaders['Authorization'], 'Bearer sk-test-key');
    assert.deepEqual(result.body.models, ['o3-mini', 'gpt-4o', 'gpt-3.5-turbo']);
  } finally {
    globalThis.fetch = origFetch;
  }
});
