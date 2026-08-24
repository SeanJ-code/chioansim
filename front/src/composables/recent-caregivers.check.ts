import { strict as assert } from 'node:assert';
// @ts-expect-error Node 的原生 TypeScript 執行需要保留副檔名。
import { updateRecentCaregivers } from './recent-caregivers.ts';

const records = updateRecentCaregivers([{ caregiverId: 'a', viewedAt: 1 }, { caregiverId: 'b', viewedAt: 2 }], 'a', 3);
assert.deepEqual(records, [{ caregiverId: 'a', viewedAt: 3 }, { caregiverId: 'b', viewedAt: 2 }]);
