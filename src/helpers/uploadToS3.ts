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

// Configure DigitalOcean Spaces
const s3 = new S3Client({
  region: "us-east-1",
  endpoint:env?.AWS_S3_ENDPOINT, 
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.AWS_S3_ACCESS_KEY!,
    secretAccessKey: env.AWS_S3_SECRET_KEY!,
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
        Bucket: env.AWS_S3_BUCKET,
        Key: fileName,
        Body: file.buffer, 
        ContentType: file.mimetype,
        ACL: "public-read",
      },
    });

    await upload.done();

    const fileUrl = `${env.AWS_S3_ENDPOINT}/${env.AWS_S3_BUCKET}/${fileName}`;

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


export const deleteFromCloud = async (fileUrl: string): Promise<void> => {
  try {
    // Extract the file key from the URL
    const key = fileUrl.replace(
      `${process.env.DO_SPACE_ENDPOINT}/${process.env.DO_SPACE_BUCKET}/`,
      ""
    );

    // Prepare the delete command
    const command = new DeleteObjectCommand({
      Bucket: `${process.env.DO_SPACE_BUCKET}`,
      Key: key,
    });

    // Execute the delete command
    await s3.send(command);

    console.log(`Successfully deleted file: ${fileUrl}`);
  } catch (error: any) {
    console.error(`Error deleting file: ${fileUrl}`, error);
    throw new Error(`Failed to delete file: ${error?.message}`);
  }
};

//delete multiple image url
export const deleteMultipleFromCloud = async (
  fileUrls: string[]
): Promise<void> => {
  try {
    if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "No file URLs provided");
    }

    // Extract file keys from URLs
    const objectKeys = fileUrls.map((fileUrl) =>
      fileUrl.replace(
        `${process.env.DO_SPACE_ENDPOINT}/${process.env.DO_SPACE_BUCKET}/`,
        ""
      )
    );

    // Prepare the delete command for multiple objects
    const command = new DeleteObjectsCommand({
      Bucket: process.env.DO_SPACE_BUCKET!,
      Delete: {
        Objects: objectKeys.map((Key) => ({ Key })),
      },
    });

    await s3.send(command);

    // console.log(`Successfully deleted files:`, fileUrls);
  } catch (error: any) {
    console.error(`Error deleting files:`, error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to delete files: ${error?.message}`
    );
  }
};