import { NextFunction, Request, Response } from "express";

export const parseBodyData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body.bodyData || req.body.data) {
    try {
      const raw = req.body.bodyData || req.body.data;
      if (typeof raw === "string") {
        req.body = JSON.parse(raw);
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON format in multipart body data",
      });
    }
  }
  next();
};
