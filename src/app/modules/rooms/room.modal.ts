import { model, Schema, Types } from "mongoose";
import { TRoom } from "./room.interface";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
const eventHistorySchema = new Schema({
  eventType: {
    type: String,
    enum: ["created","updated", "approved","activated","deactivated","distributed"],
    default: "pending",
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
      trim: true,
      uppercase:true
      
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
    department: {
      type: String,
      default: "Computer Science and Engineering",
    },
    assignedRoom:{
      type:Schema.ObjectId,
      ref:"Faculty"
    },
    description: {
      type: String,
      maxlength: 500,
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
    distributedAccessoriesDetails:{
      type:[Types.ObjectId],
      ref:"Accessory"
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
