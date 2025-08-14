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
 
// Allow only JPEG/JPG/PNG images
const allowedMimeTypes = new Set<string>(['image/jpeg', 'image/jpg', 'image/png']);
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new AppError(400, file.fieldname, 'Only JPEG, JPG, and PNG images are allowed'));
};
 
export const upload = multer({
  storage: storage,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter,
});

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
    console.log(req,"uploadImagesByFields")
    upload.fields(fields)(req, res, (err: any) => {
      console.log(req,"req file")
      console.log(err,"err file")
      if (err) {
        console.log(err,"file erroroe")
        if (err instanceof multer.MulterError) {
          let friendlyMessage = err.message || 'Upload error';
          if (err.code === 'LIMIT_FILE_SIZE') {
            console.log("here")
            friendlyMessage = 'Max file size allowed is 1MB';
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            console.log("here1")
            friendlyMessage = 'Maximum number of files exceeded';
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            console.log("here2")
            friendlyMessage = 'Unexpected file or field name';
          }
          const errorField = (err as any).field || 'file';
          console.log(errorField,friendlyMessage,"errorField")
        return next(  new AppError(400, errorField, friendlyMessage))
        
        }
        return next(err);
      }
      next();
    });
  };
};

export const uploadSingleImage = (fieldName: string): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          let friendlyMessage = err.message || 'Upload error';
          if (err.code === 'LIMIT_FILE_SIZE') {
            friendlyMessage = 'Max file size allowed is 2MB';
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