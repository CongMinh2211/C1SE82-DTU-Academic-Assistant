import test from 'node:test';
import assert from 'node:assert/strict';
import { postgresConnectionUrl } from '../postgres-connection';

test('Loopback PostgreSQL permits no TLS only on explicit local opt-in', () => {
  const base = 'postgresql://student:secret@127.0.0.1:5432/dtu_academic_assistant';
  assert.equal(new URL(postgresConnectionUrl(base)).searchParams.get('sslmode'), 'verify-full');
  assert.equal(new URL(postgresConnectionUrl(base, { allowLocalNoTls: true })).searchParams.get('sslmode'), 'disable');
  assert.equal(new URL(postgresConnectionUrl(base, { allowLocalNoTls: true, deployed: true })).searchParams.get('sslmode'), 'verify-full');
});

test('Remote PostgreSQL never allows TLS downgrade', () => {
  const url = 'postgresql://user:secret@db.example.com/app?sslmode=disable';
  assert.equal(new URL(postgresConnectionUrl(url, { allowLocalNoTls: true })).searchParams.get('sslmode'), 'verify-full');
  assert.throws(() => postgresConnectionUrl('https://db.example.com'), /Invalid PostgreSQL URL/);
});
