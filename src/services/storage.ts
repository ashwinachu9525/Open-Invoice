import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT
  const region = process.env.S3_REGION ?? "auto"

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
    forcePathStyle: !!endpoint,
  })
}

const BUCKET = process.env.S3_BUCKET_NAME ?? "invoice-saas"

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const client = getS3Client()
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return key
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client()
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  )
}

export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
