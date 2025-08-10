import { model, Schema, Types } from "mongoose";
import { CategoryModel, TCategory } from "./category.interface";
const eventHistorySchema = new Schema({
  eventType: {
    type: String,
    enum: ["created","updated", "approved","activated","deactivated"],
   
  },
  
  performedBy: {
    type: Types.ObjectId,
    ref: "Faculty",
  },
  performedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  comments: {
    type: String,
  },
  
});
const categorySchema = new Schema<TCategory, CategoryModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    eventsHistory:[eventHistorySchema]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    
  }
);
// Define a virtual field to populate subcategories
categorySchema.virtual("subCategories", {
  ref: "SubCategory",
  localField: "_id",
  foreignField: "category",
});
categorySchema.statics.isCategoryNameExists =
  async function isCategoryNameExists(name: string) {
    return await this.findOne({ name: name });
  };

export const Category = model<TCategory, CategoryModel>(
  "Category",
  categorySchema
);
