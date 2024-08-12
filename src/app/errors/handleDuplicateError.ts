import { TGenericErrorResponse } from "../interfaces/error";
import { TErrorMessages } from "../interfaces/error";


const handleDuplicateError = (err: any): TGenericErrorResponse => {
  const errorMessages: TErrorMessages = [
    {
      path: "",
      message: err?.message,
    },
  ];

  const statusCode = 400;

  return {
    statusCode,
    message: "Invalid ID",
    errorMessages,
  };
};

export default handleDuplicateError;
