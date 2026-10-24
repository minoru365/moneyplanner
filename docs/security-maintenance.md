# Security maintenance — 2026-10-24

Expo is patched within SDK 54 to 54.0.38; firebase-tools resolves to 15.34.1 and
tsx to 4.23.15. React Native 0.81.5 and RNFirebase 24.0.0 remain unchanged.
The expo-router override references the direct dependency to prevent an unrelated
SDK 58 peer installation. npm 11 generated the lock after an npm 10 internal error;
system npm was not changed.

Scoped overrides intentionally exceed parent ranges:

| Parent | Original range | Selected | Compatibility evidence |
|---|---|---|---|
| @expo/metro-config → postcss | ~8.4.32 | 8.5.31 | Parse/plugin transform |
| @expo/metro → Metro family (14 packages) | 0.83.3 | 0.83.8 | Buffer and real disk/density image regression; full iOS export required |
| @firebase/firestore → @grpc/grpc-js | ~1.9.0 | 1.14.6 | Credentials/metadata and 45 emulator rules tests |
| @google-cloud/pubsub → @opentelemetry/core | ^1.30.1 | 2.8.0 | Trace context extract/inject |
| gaxios → uuid | ^9.0.1 | 11.1.1 | CommonJS v4 generation/validation |
| express → qs | ~6.14.0 | 6.16.1 | Query arrays/prototype rejection |

Initial validation: frozen npm install (scripts disabled), 7 dependency tests, lint,
TypeScript, Expo compatibility and npm ls passed. The regular suite reported
363 pass / 45 skip; the separate Firestore emulator run passed all 45 rules tests.
Emulator permission-denied messages are expected for rejection tests. The emulator
reported an unavailable optional VSCode notification endpoint after successful tests.
Deprecated transitive packages remain (including inflight, rimraf, glob, json-ptr
and node-domexception); they were not used as a reason for unrelated migrations.

npm audit decreased from 59 affected packages (4 critical) to 12 (9 high,
3 moderate, 0 critical). These are transitive propagation counts for two underlying
advisories, not 12 distinct issues:

- node-forge 1.4.0: [GHSA-86w9-cpqp-85rv](https://github.com/digitalbazaar/forge/issues/1149),
  high, no published fix at review time. Expo CLI/code-signing introduces it;
  application code does not directly import it. Malicious signatures/certificates
  reaching the affected RSA verifier are the relevant condition. No custom crypto patch.
- decode-uri-component 0.2.2: [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr),
  moderate malformed-input CPU denial of service. Fixed 0.5.x is ESM, incompatible
  with query-string 7.1.3's callable CommonJS import. Inspected Expo Router call sites
  use stringify rather than the affected parse decoder; this limits observed exposure
  but does not prove every path unreachable. A compatible upstream fix or separately
  reviewed router migration remains necessary to remove the audit finding.

Do not suppress these findings or force an Expo downgrade. Recheck before release.
Human review must cover existing dev-client flows in development-setup.md and
native runtime/deep links. Auth, billing, Firestore rules and application data
were not changed.

## Build compatibility correction

The first authorized EAS build (1.0.4 build 44) failed while bundling unmatched.png.
The image-size 2.0.4 override passed a buffer test but did not support Metro's
filename API. A real on-disk PNG/density regression reproduces that failure.
The override has been replaced by the aligned official Metro 0.83.8 family, which
[removes image-size](https://github.com/react/metro/releases/tag/v0.83.8).
This includes Metro's required parser/ob1 transitive updates. No local patch or
postinstall modification is used. Remove these overrides when Expo adopts the fix.
The failed build must not be submitted. Retry only after normal frozen install,
8 dependency tests, full tests, lint, tsc, Expo checks and full local iOS export.

Correction validation: frozen npm ci followed by npm rebuild (npm 11 had deferred
dependency lifecycle scripts) succeeded. All 8 dependency tests passed; full suite
364 pass / 45 skip, lint, tsc and Expo install check passed. Full iOS export including
unmatched.png passed. All 14 Metro packages resolve to 0.83.8 and image-size is absent.
Audit remains 9H/3M. No generated export or node_modules files are tracked.
