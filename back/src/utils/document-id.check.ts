import assert from 'node:assert/strict'
import { Types } from 'mongoose'
import { normalizeDocumentId } from './document-id'

const id = new Types.ObjectId()

assert.equal(normalizeDocumentId(String(id)), String(id))
assert.equal(normalizeDocumentId(id), String(id))
assert.equal(normalizeDocumentId({ _id: id }), String(id))
assert.equal(normalizeDocumentId({ _id: String(id) }), String(id))
assert.equal(normalizeDocumentId('[object Object]'), undefined)
assert.equal(normalizeDocumentId({}), undefined)
assert.equal(normalizeDocumentId(undefined), undefined)

console.log('Document ID normalization check passed')
