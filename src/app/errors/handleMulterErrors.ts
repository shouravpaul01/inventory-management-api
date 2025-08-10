import multer from 'multer';
import httpStatus from 'http-status';
import { TErrorMessages, TGenericErrorResponse } from '../interfaces/error';

const handleMulterErrors = (error: multer.MulterError): TGenericErrorResponse => {
  let message = 'Multer Error';
  const errorMessages: TErrorMessages = [];

  if (error.code === 'LIMIT_FILE_SIZE') {
    message = 'File size exceeds the allowed limit';
    errorMessages.push({
      path: 'file',
      message: 'Max file size allowed is 2MB',
    });
  } else if (error.code === 'LIMIT_FILE_COUNT') {
    message = 'Too many files uploaded';
    errorMessages.push({
      path: 'files',
      message: 'Maximum number of files exceeded',
    });
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    message = 'Unexpected file field';
    errorMessages.push({
      path: 'file',
      message: 'Unexpected file or field name',
    });
  } else {
    errorMessages.push({
      path: 'file',
      message: error.message || 'Unknown multer error',
    });
  }

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message,
    errorMessages,
  };
};

export default handleMulterErrors;
