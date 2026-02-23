import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  // 👇 IMPORT THESE TYPES
  ListObjectsV2CommandOutput,
  ObjectIdentifier,
} from "@aws-sdk/client-s3";

// 1. Initialize the Client
const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// 2. Upload Helper Function
export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string = "image/png",
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filename,
    Body: buffer,
    ContentType: contentType,
  });

  try {
    await R2.send(command);
    // Return the Public URL
    return `${process.env.R2_PUBLIC_URL}/${filename}`;
  } catch (error) {
    console.error("R2 Upload Error:", error);
    throw new Error("Failed to upload image to Cloudflare R2");
  }
}

// 3. Delete Single File Helper
export async function deleteFromR2(fileKey: string) {
  try {
    console.log(`🗑️ Attempting to delete from R2: ${fileKey}`);

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });

    await R2.send(command);
    console.log(`✅ Successfully deleted ${fileKey} from R2`);
  } catch (error) {
    console.error("❌ R2 Deletion Error:", error);
  }
}

// 4. ✅ FIXED: Delete Entire Folder (Recursive)
export async function deleteBatchFiles(fileKeys: string[]) {
  if (!fileKeys.length) return;

  try {
    console.log(`🔥 Deleting ${fileKeys.length} specific files from R2...`);

    // S3 only allows deleting 1000 objects per request.
    // If you have more, we chunk them.
    const chunkSize = 1000;
    for (let i = 0; i < fileKeys.length; i += chunkSize) {
      const batch = fileKeys.slice(i, i + chunkSize);

      const command = new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: true,
        },
      });

      await R2.send(command);
    }

    console.log("✅ Batch delete complete.");
  } catch (error) {
    console.error("❌ Failed to delete batch files:", error);
    // We don't throw here so account deletion can continue
  }
}
