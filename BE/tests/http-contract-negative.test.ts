import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { endpoint, jsonBody, HttpError } from '../http';

const origin = 'http://localhost:8001';
const schema = z.object({ question: z.string().trim().min(1) });
const invoke = (request: Request) => endpoint(async (r) => ({ accepted: (await jsonBody(r, schema)).question }))(request);

test('415 for missing JSON content type', async () => {
  const response = await invoke(new Request(origin, { method: 'POST', body: 'question=hello' }));
  assert.equal(response.status, 415);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match((await response.json()).error, /JSON/);
});

test('400 for missing required question, malformed JSON, and empty question', async () => {
  for (const body of ['{}', '{broken', '{"question":"  "}']) {
    const response = await invoke(new Request(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body }));
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(typeof payload.ref, 'string');
    assert.ok(!JSON.stringify(payload).includes('ZodError'));
  }
});

test('500 hides internal secret and returns correlation reference', async () => {
  const leaked = 'test-secret-must-not-be-in-response';
  const response = await endpoint(async () => { throw new Error(leaked); })(new Request(origin));
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.ok(!body.includes(leaked));
  assert.match(body, /"ref"/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Expected HttpError keeps status and controlled message', async () => {
  const response = await endpoint(async () => { throw new HttpError(403, 'Forbidden'); })(new Request(origin));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, 'Forbidden');
});
