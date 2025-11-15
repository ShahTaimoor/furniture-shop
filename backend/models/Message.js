const mongoose = require('mongoose');

const { Schema } = mongoose;

const attachmentSchema = new Schema(
  {
    url: { type: String, trim: true },
    type: { type: String, enum: ['image', 'file'], default: 'file' },
    name: { type: String, trim: true },
    size: { type: Number },
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    attachments: [attachmentSchema],
    seenBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ chat: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });

messageSchema.pre('save', function preSave(next) {
  if (!this.seenBy?.length) {
    this.seenBy = [this.sender];
  } else if (!this.seenBy.some((id) => id.toString() === this.sender.toString())) {
    this.seenBy.push(this.sender);
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);

