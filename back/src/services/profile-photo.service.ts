import { randomUUID } from 'node:crypto'
import { v2 as cloudinary } from 'cloudinary'

function configureCloudinary(): void {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
    secure: true,
  })
}

export async function uploadProfilePhoto(
  buffer: Buffer,
): Promise<{ url: string; publicId: string }> {
  configureCloudinary()
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'chioansim/caregivers',
          public_id: randomUUID(),
          resource_type: 'image',
          overwrite: false,
        },
        (error, uploaded) =>
          error || !uploaded
            ? reject(error || new Error('Cloudinary 未回傳圖片資料'))
            : resolve(uploaded),
      )
      .end(buffer)
  })
  return { url: result.secure_url, publicId: result.public_id }
}

export async function deleteProfilePhoto(publicId: string): Promise<void> {
  configureCloudinary()
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })
}
