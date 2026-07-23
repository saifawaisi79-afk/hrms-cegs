const assert = require('assert');
const { ipToInt, ipInCidr } = require('../middleware/ipWhitelist');

console.log('=================================================');
console.log('Running IP Whitelist CIDR Matching Unit Tests...');
console.log('=================================================');

try {
  // Test 1: ipToInt parser
  assert.strictEqual(ipToInt('10.30.0.1'), 169738241, 'ipToInt("10.30.0.1") failed');
  assert.strictEqual(ipToInt('192.168.32.1'), 3232243713, 'ipToInt("192.168.32.1") failed');
  assert.strictEqual(ipToInt('::ffff:10.30.0.1'), 169738241, 'ipToInt(::ffff: IPv4-mapped) failed');
  assert.strictEqual(ipToInt('invalid'), null, 'ipToInt should return null for invalid format');
  assert.strictEqual(ipToInt('256.0.0.1'), null, 'ipToInt should return null for range overflow');
  console.log('✔ Test 1: ipToInt utility parsed IPs successfully');

  // Test 2: IPs inside 10.30.0.0/20 range (covers 10.30.0.0 - 10.30.15.255)
  assert.strictEqual(ipInCidr('10.30.0.1', '10.30.0.0/20'), true, 'Boundary IP 10.30.0.1 should be allowed');
  assert.strictEqual(ipInCidr('10.30.15.254', '10.30.0.0/20'), true, 'Boundary IP 10.30.15.254 should be allowed');
  assert.strictEqual(ipInCidr('10.30.8.45', '10.30.0.0/20'), true, 'Mid-range IP 10.30.8.45 should be allowed');
  console.log('✔ Test 2: Office WiFi IPs (10.30.0.0/20) allowed correctly');

  // Test 3: IPs inside 192.168.32.0/22 range (covers 192.168.32.0 - 192.168.35.255)
  assert.strictEqual(ipInCidr('192.168.32.1', '192.168.32.0/22'), true, 'Boundary IP 192.168.32.1 should be allowed');
  assert.strictEqual(ipInCidr('192.168.35.254', '192.168.32.0/22'), true, 'Boundary IP 192.168.35.254 should be allowed');
  assert.strictEqual(ipInCidr('192.168.33.100', '192.168.32.0/22'), true, 'Mid-range IP 192.168.33.100 should be allowed');
  console.log('✔ Test 3: Office LAN IPs (192.168.32.0/22) allowed correctly');

  // Test 4: Edge Cases (Network and Broadcast addresses)
  assert.strictEqual(ipInCidr('10.30.0.0', '10.30.0.0/20'), true, 'Network address 10.30.0.0 should be allowed');
  assert.strictEqual(ipInCidr('10.30.15.255', '10.30.0.0/20'), true, 'Broadcast address 10.30.15.255 should be allowed');
  assert.strictEqual(ipInCidr('192.168.32.0', '192.168.32.0/22'), true, 'Network address 192.168.32.0 should be allowed');
  assert.strictEqual(ipInCidr('192.168.35.255', '192.168.32.0/22'), true, 'Broadcast address 192.168.35.255 should be allowed');
  console.log('✔ Test 4: Network and broadcast boundary edge cases handled correctly');

  // Test 5: IPs outside both whitelists (should be blocked)
  assert.strictEqual(ipInCidr('10.30.16.0', '10.30.0.0/20'), false, 'IP 10.30.16.0 should be blocked');
  assert.strictEqual(ipInCidr('10.29.255.255', '10.30.0.0/20'), false, 'IP 10.29.255.255 should be blocked');
  assert.strictEqual(ipInCidr('192.168.31.255', '192.168.32.0/22'), false, 'IP 192.168.31.255 should be blocked');
  assert.strictEqual(ipInCidr('192.168.36.0', '192.168.32.0/22'), false, 'IP 192.168.36.0 should be blocked');
  assert.strictEqual(ipInCidr('8.8.8.8', '10.30.0.0/20'), false, 'Public DNS IP 8.8.8.8 should be blocked');
  assert.strictEqual(ipInCidr('127.0.0.1', '10.30.0.0/20'), false, 'Localhost IP 127.0.0.1 should be blocked');
  console.log('✔ Test 5: IPs outside whitelist ranges blocked successfully');

  console.log('=================================================');
  console.log('✔ ALL UNIT TESTS PASSED SUCCESSFULLY!');
  console.log('=================================================');
} catch (err) {
  console.error('❌ UNIT TEST SUITE FAILURE:', err);
  process.exit(1);
}
