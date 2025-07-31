import { model, Schema, Types } from "mongoose";
import { TRoom } from "./room.interface";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";

const roomSchema = new Schema<TRoom>(
  {
    roomNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    building: {
      type: String,
    },
    floor: {
      type: String,
      required: true,
      
    },
    roomType: {
      type: String,
      required: true,
      enum: [
        "Classroom",
        "Lecture Hall",
        "Laboratory",
        "Office",
        "Conference",
        "Storage",
        "Server Room",
        "Library",
        "Workshop",
        "Other",
      ],
      default: "Classroom",
    },
    capacity: {
      type: Number,
      required: function () {
        return ["Classroom", "Lecture Hall", "Conference"].includes(
          this.roomType
        );
      },
    },
    images: {
      type: [String],
    },
    description: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    features: {
      type: [String],
      enum: [
        "Projector",
        "Whiteboard",
        "Smart Board",
        "Sound System",
        "AC",
        "Heating",
        "WiFi",
        "Disabled Access",
        "Video Conferencing",
        "Furniture",
      ],
      default: [],
    },
    equipment: {
      type: [
        {
          accessories: [
            {
              accessory: {
                type: Schema.Types.ObjectId,
                ref: "Accessory",
              },
              quantity: { type: Number },
              codes: { type: [String] },
            },
          ],
          totalQuantity: {
            type: Number,
            default: 0,
          },
        },
      ],
      default: [],
    },
    department: {
      type: String,
      default: "Computer Science and Engineering",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvalDetails: {
      isApproved: {
        type: Boolean,
        default: false,
      },
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      approvedDate: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

// Pre-save hook to validate room number uniqueness within building
roomSchema.pre("save", async function (next) {
  const existingRoom = await this.model("Room").findOne({
    building: this.building,
    roomNumber: this.roomNo,
    _id: { $ne: this._id },
  });

  if (existingRoom) {
    throw new AppError(
      httpStatus.CONFLICT,
      "roomNo",
      `Room number ${this.roomNo} already exists in this building`
    );
  }
  next();
});

export const Room = model<TRoom>("Room", roomSchema);
