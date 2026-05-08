import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  // 👇 IMPORT THESE TYPES
  ListObjectsV2CommandOutput,
  ObjectIdentifier,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 1. Initialize the Client
const R2 = new S3Client({
  region: "auto",
  // 🌟 Use the S3 API URL specifically for the client
  endpoint: process.env.R2_S3_API_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function getSignedViewUrl(fileKey: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });

    // 🌟 This will now return a full URL starting with https://...
    const url = await getSignedUrl(R2, command, { expiresIn: 3600 });
    return url;
  } catch (error) {
    console.error("❌ Signing Error:", error);
    return "";
  }
}
// 2. Upload Helper Function (FIXED FOR PRIVATE STORAGE)
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

    // ✅ FIX: Stop returning the Public URL (e.g. pub-xxx.r2.dev)
    // Return only the filename/key. This is what we will save in the DB.
    return filename;
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
