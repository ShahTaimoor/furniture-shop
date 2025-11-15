const mongoose = require('mongoose');

const { Schema } = mongoose;

const lastMessageSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    content: { type: String, trim: true },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date },
    attachments: [
      {
        url: String,
        type: { type: String, enum: ['image', 'file'] },
        name: String,
      },
    ],
  },
  { _id: false }
);

const chatSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    participantHash: {
      type: String,
      index: true,
      required: true,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    metadata: {
      title: { type: String, trim: true },
      avatar: { type: String, trim: true },
      description: { type: String, trim: true },
    },
    lastMessage: lastMessageSchema,
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ updatedAt: -1 });
chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);

