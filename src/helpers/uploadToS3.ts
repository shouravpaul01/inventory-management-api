import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import ApiError from "../errors/ApiErrors";
import httpStatus from "http-status";
import { env } from "../config/env.config";
import path from "path";

// Configure DigitalOcean Spaces / S3
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: (env as any)?.AWS_S3_ENDPOINT || "https://s3.amazonaws.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: (env as any)?.AWS_S3_ACCESS_KEY || "mock_key",
    secretAccessKey: (env as any)?.AWS_S3_SECRET_KEY || "mock_secret",
  },
});

export const uploadFileToS3 = async (
  file: Express.Multer.File
): Promise<{ fileUrl: string }> => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `uploads/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}${fileExtension}`;

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: (env as any)?.AWS_S3_BUCKET || "default-bucket",
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      },
    });

    await upload.done();

    const fileUrl = `${(env as any)?.AWS_S3_ENDPOINT || ""}/${(env as any)?.AWS_S3_BUCKET || ""}/${fileName}`;

    return { fileUrl };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to upload file: ${error.message}`
        : "Failed to upload file"
    );
  }
};

export const deleteFileFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    const urlParts = fileUrl.split("/");
    const key = urlParts.slice(3).join("/");

    const command = new DeleteObjectCommand({
      Bucket: (env as any)?.AWS_S3_BUCKET,
      Key: key,
    });

    await s3.send(command);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete file from S3"
    );
  }
};