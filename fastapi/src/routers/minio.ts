import { Router } from "express";
import { randomUUID } from "node:crypto";
import { Client } from "minio";
import { asyncHandler, HttpError } from "../errors";
import { readSecret, verifyInternalKey } from "../security/apiKeyCheck";

const MINIO_BUCKET = process.env.MINIO_BUCKET;
if (!MINIO_BUCKET) {
  throw new Error("MINIO_BUCKET is not set");
}
const [endPoint, port] = (process.env.MINIO_ENDPOINT ?? "minio:9000").split(":");

const minioClient = new Client({
  endPoint,
  port: Number(port),
  useSSL: false,
  accessKey: readSecret("minio_app_user"),
  secretKey: readSecret("minio_app_password"),
});

export const router = Router();

interface UploadUrlRequest {
  content_type: string;
  filename: string;
}

function parseUploadRequest(body: unknown): UploadUrlRequest {
  const b = body as Partial<UploadUrlRequest> | undefined;
  if (typeof b?.content_type !== "string" || typeof b?.filename !== "string") {
    throw new HttpError(422, "content_type and filename are required strings");
  }
  return { content_type: b.content_type, filename: b.filename };
}

// Generate presigned upload URL
router.post(
  "/api/uploads",
  asyncHandler(async (req, res) => {
    verifyInternalKey(req.header("x-internal-key"));
    const file = parseUploadRequest(req.body);

    const extension = file.filename.includes(".") ? "." + file.filename.split(".").pop() : "";
    const objectName = `${randomUUID()}${extension}`;

    try {
      const url = await minioClient.presignedPutObject(MINIO_BUCKET, objectName, 24 * 60 * 60);
      res.json({ object_name: objectName, url });
    } catch (e) {
      console.error(e);
      throw new HttpError(500, e instanceof Error ? e.message : String(e));
    }
  }),
);

// Generate download URL (like the original, no internal key required)
router.get(
  "/api/downloads/*",
  asyncHandler(async (req, res) => {
    const objectName = (req.params as Record<string, string>)[0];
    try {
      const url = await minioClient.presignedGetObject(MINIO_BUCKET, objectName, 10 * 60);
      res.json({ url });
    } catch (e) {
      throw new HttpError(500, e instanceof Error ? e.message : String(e));
    }
  }),
);
