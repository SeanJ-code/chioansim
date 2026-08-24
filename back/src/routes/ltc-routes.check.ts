import assert from 'node:assert/strict'
import { distanceMeters, parseCsv } from './ltc-routes'

assert.deepEqual(parseCsv('a,b\n"x,y","say ""hi"""\n'), [['a', 'b'], ['x,y', 'say "hi"']])
assert.ok(Math.abs(distanceMeters(25.033, 121.5654, 25.033, 121.5754) - 1009) < 10)
console.log('ltc route checks passed')
