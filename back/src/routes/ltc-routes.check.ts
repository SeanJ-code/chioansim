import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { distanceMeters, parseCsv, toCenters } from './ltc-routes'

assert.deepEqual(parseCsv('a,b\n"x,y","say ""hi"""\n'), [['a', 'b'], ['x,y', 'say "hi"']])
assert.ok(Math.abs(distanceMeters(25.033, 121.5654, 25.033, 121.5754) - 1009) < 10)
const snapshotText = gunzipSync(readFileSync('data/ltc-abc.csv.gz')).toString('utf8')
const snapshot = parseCsv(snapshotText.replace(/^\uFEFF/, ''))
assert.ok(snapshot[0]?.includes('機構名稱') && snapshot[0]?.includes('經度') && snapshot[0]?.includes('緯度'))
assert.ok(toCenters(snapshotText).length > 1_000)
console.log('ltc route checks passed')
