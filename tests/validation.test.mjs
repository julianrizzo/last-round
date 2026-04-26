import assert from 'node:assert/strict';
import test from 'node:test';

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(fromLat, fromLng, toLat, toLng) {
  const earthRadiusM = 6371e3;
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);
  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isNextStop(expectedIndex, completedHighestIndex) {
  return expectedIndex === completedHighestIndex + 1;
}

test('distance near-identical points is almost zero', () => {
  const distance = calculateDistanceMeters(-33.87002, 151.20501, -33.87003, 151.20502);
  assert.ok(distance < 3);
});

test('distance check fails when outside radius', () => {
  const distance = calculateDistanceMeters(-33.87002, 151.20501, -33.875, 151.22);
  assert.ok(distance > 120);
});

test('stop sequence validation allows only next index', () => {
  assert.equal(isNextStop(3, 2), true);
  assert.equal(isNextStop(4, 2), false);
  assert.equal(isNextStop(2, 2), false);
});
