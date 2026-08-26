import assert from 'node:assert/strict'
import { userRoom, userRooms } from './realtime'

assert.equal(userRoom('user-a'), 'user:user-a')
assert.deepEqual(userRooms(['user-a', 'caregiver-a', 'user-a', undefined]), ['user:user-a', 'user:caregiver-a'])
assert(!userRooms(['user-a']).includes(userRoom('user-b')))
console.log('Realtime room isolation check passed')
