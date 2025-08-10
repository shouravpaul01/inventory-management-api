import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinaryConfig } from './cloudinary.config';
import multer from 'multer';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import AppError from '../errors/AppError';
import { TFieldDef } from '../interfaces';

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryConfig,
  params: {
    folder: 'inventory_management',
  } as any,
});
 
export const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 } });

export const uploadMultipleImages = (fieldName: string, maxCount?: number): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.array(fieldName, maxCount)(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          let friendlyMessage = err.message || 'Upload error';
          if (err.code === 'LIMIT_FILE_SIZE') {
            friendlyMessage = 'Max file size allowed is 2MB';
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            friendlyMessage = 'Maximum number of files exceeded';
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            friendlyMessage = 'Unexpected file or field name';
          }
          return next(new AppError(400, fieldName, friendlyMessage));
        }
        return next(err);
      }
      next();
    });
  };
};



export const uploadImagesByFields = (fields: TFieldDef[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.fields(fields)(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          let friendlyMessage = err.message || 'Upload error';
          if (err.code === 'LIMIT_FILE_SIZE') {
            friendlyMessage = 'Max file size allowed is 2MB';
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            friendlyMessage = 'Maximum number of files exceeded';
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            friendlyMessage = 'Unexpected file or field name';
          }
          const errorField = (err as any).field || 'file';
          return next(new AppError(400, errorField, friendlyMessage));
        }
        return next(err);
      }
      next();
    });
  };
};