const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');

const fromPackage = (name) => createRequire(require.resolve(name + '/package.json'));

test('Metro reads PNG buffers through its patched image parser', () => {
  const metroRoot = path.dirname(require.resolve('metro/package.json'));
  const { getAssetSize } = require(path.join(metroRoot, 'src/Assets.js'));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTHsAAAAASUVORK5CYII=', 'base64');
  assert.deepEqual(getAssetSize('png', png, 'fixture.png'), { width: 1, height: 1 });
  assert.throws(() => getAssetSize('png', Buffer.alloc(0), 'empty.png'));
  assert.equal(getAssetSize('txt', Buffer.from('text'), 'fixture.txt'), null);
});

test('Expo Metro PostCSS override retains parsing and transformation APIs', async () => {
  const postcss = fromPackage('@expo/metro-config')('postcss');
  const result = await postcss([{
    postcssPlugin: 'compatibility-fixture',
    Declaration(decl) { if (decl.prop === 'color') decl.value = 'blue'; },
  }]).process('.fixture { color: red }', { from: undefined, map: false });
  assert.match(result.css, /color: blue/);
  assert.equal(postcss.parse(result.css).first.selector, '.fixture');
});

test('Expo Router query serialization preserves encoded route parameters', () => {
  const query = fromPackage('expo-router')('query-string');
  assert.equal(query.stringify({ name: '日本語', percent: '%FF' }, { sort: false }),
    'name=%E6%97%A5%E6%9C%AC%E8%AA%9E&percent=%25FF');
});

test('Firestore gRPC override retains credentials and metadata APIs', () => {
  const grpc = fromPackage('@firebase/firestore')('@grpc/grpc-js');
  assert.ok(grpc.credentials.createInsecure());
  const metadata = new grpc.Metadata();
  metadata.set('x-compatibility-test', 'ok');
  assert.deepEqual(metadata.get('x-compatibility-test'), ['ok']);
});

test('PubSub telemetry override supports W3C context propagation', () => {
  const pubsubRequire = fromPackage('@google-cloud/pubsub');
  const { W3CTraceContextPropagator } = pubsubRequire('@opentelemetry/core');
  const api = pubsubRequire('@opentelemetry/api');
  const propagator = new W3CTraceContextPropagator();
  const carrier = { traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' };
  const context = propagator.extract(api.ROOT_CONTEXT, carrier, api.defaultTextMapGetter);
  assert.equal(api.trace.getSpanContext(context).traceId, '0af7651916cd43dd8448eb211c80319c');
  const output = {};
  propagator.inject(context, output, api.defaultTextMapSetter);
  assert.equal(output.traceparent, carrier.traceparent);
});

test('Gaxios UUID override keeps the v4 CommonJS API', () => {
  const { v4, validate } = fromPackage('gaxios')('uuid');
  const first = v4();
  assert.ok(validate(first));
  assert.notEqual(first, v4());
});

test('Express query parser rejects prototype keys and retains arrays', () => {
  const qs = fromPackage('express')('qs');
  const result = qs.parse('tags[]=one&tags[]=two&__proto__[polluted]=yes');
  assert.deepEqual(result.tags, ['one', 'two']);
  assert.equal({}.polluted, undefined);
});

test('Metro bundles disk PNG assets and density variants without path decoding errors', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const metroRoot = path.dirname(require.resolve('metro/package.json'));
  const { getAssetData } = require(path.join(metroRoot, 'src/Assets.js'));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'metro-asset-compat-'));
  const file = path.join(directory, 'fixture.png');
  const retinaFile = path.join(directory, 'fixture@2x.png');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTHsAAAAASUVORK5CYII=', 'base64');
  try {
    fs.writeFileSync(file, png);
    fs.writeFileSync(retinaFile, png);
    const asset = await getAssetData(file, 'fixture.png', [], 'ios', '/assets');
    assert.equal(asset.width, 1);
    assert.equal(asset.height, 1);
    assert.deepEqual(asset.scales, [1, 2]);
    assert.deepEqual(asset.files, [file, retinaFile]);
    assert.equal(asset.__packager_asset, true);
  } finally {
    for (const fixture of [file, retinaFile]) {
      if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
    }
    fs.rmdirSync(directory);
  }
});
