import { cloudinaryConfig } from "../config/cloudinary.config";

export const deleteFileFromCloudinary = async (url: string) => {
  const public_id = `inventory_management/${
    url.split("/").slice(-1)[0].split(".")[0]
  }`;
  const result = await cloudinaryConfig.uploader.destroy(public_id);
  if (result.result === "ok") {
    return true;
  } else {
    return false;
  }
};
