import { isValidObjectId } from 'mongoose'

export function normalizeDocumentId(value: unknown): string | undefined {
  const id =
    typeof value === 'string' || isValidObjectId(value)
      ? value
      : value && typeof value === 'object' && '_id' in value
        ? String((value as { _id: unknown })._id)
        : undefined
  return id && isValidObjectId(id) ? String(id) : undefined
}
