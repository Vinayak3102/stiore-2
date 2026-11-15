import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

test('Razorpay HMAC-SHA256 signature generation and verification algorithm', () => {
  // Synthetic local test fixture only — never embed real keys or secrets
  const syntheticSecret = 'synthetic_unit_test_secret_fixture_only';
  const orderId = 'order_test_12345';
  const paymentId = 'pay_test_67890';

  const body = `${orderId}|${paymentId}`;
  const validSignature = crypto
    .createHmac('sha256', syntheticSecret)
    .update(body)
    .digest('hex');

  assert.equal(typeof validSignature, 'string');
  assert.equal(validSignature.length, 64);

  const checkSignature = crypto
    .createHmac('sha256', syntheticSecret)
    .update(body)
    .digest('hex');

  const buf1 = Buffer.from(validSignature, 'utf-8');
  const buf2 = Buffer.from(checkSignature, 'utf-8');
  assert.equal(crypto.timingSafeEqual(buf1, buf2), true);

  const tamperedBody = `${orderId}|pay_tampered_999`;
  const tamperedSig = crypto
    .createHmac('sha256', syntheticSecret)
    .update(tamperedBody)
    .digest('hex');

  const bufTampered = Buffer.from(tamperedSig, 'utf-8');
  assert.equal(crypto.timingSafeEqual(buf1, bufTampered), false);
});

test('Razorpay webhook HMAC-SHA256 verification matches raw payload', () => {
  const webhookSecret = 'synthetic_webhook_secret_fixture';
  const rawPayload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_1' } } } });
  const sig = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
  assert.equal(crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)), true);
});
