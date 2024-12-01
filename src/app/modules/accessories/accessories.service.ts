import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { TAccessory } from "./accessories.interface";
import { Accessory } from "./accessories.modal";
import { TFileUpload } from "../../interfaces";
import { generateAccessoriesCode, generateAccessoryCodeTitle } from "./accessories.utils";

const createAccessoryIntoDB = async (file:TFileUpload,payload: TAccessory & {codeTitle:string,quantity:number}) => {
  console.log(payload,"dddd")
    const isAccessoryExists=await Accessory.findOne({name:payload.name})
    if(isAccessoryExists) {
      throw new AppError(httpStatus.UNPROCESSABLE_ENTITY,"name","Name already exists."); 
    }
    if (file) {
      payload.image=file.path
    }
    if (!payload.quantityDetails) {
      payload.quantityDetails = {
        totalQuantity: 0,
        currentQuantity: 0,
      };
    }
    const codeTitle=await generateAccessoryCodeTitle(payload.subCategory,payload.codeTitle)
    const codes=await generateAccessoriesCode(payload.quantity as number,codeTitle)
    if (!payload.codeDetails) {
      payload.codeDetails = {
        codeTitle:codeTitle,
        totalCodes:[],
        currentCodes:[]
      };
    }
  
    payload.quantityDetails.totalQuantity=payload.quantity
    payload.quantityDetails.currentQuantity=payload.quantity
    payload.codeDetails.totalCodes=codes
    payload.codeDetails.currentCodes=codes

    const result = await Accessory.create(payload);
    return result;
  };

  export const AccessoryServices={
    createAccessoryIntoDB
  }