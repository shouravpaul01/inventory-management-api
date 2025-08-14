import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}
export type TFileUpload = {
  fieldname: string; 
  originalname: string;
  encoding: string; 
  mimetype: string;
  path: string; 
  size: number;
  filename: string; 
};
export type TFieldDef = { name: string; maxCount?: number };