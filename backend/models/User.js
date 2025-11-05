const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        password: {
            type: String,
            required: true,
            minLength: 6,
        },
        role: {
            type: Number,
            default: 0,
            enum: [0, 1, 2] // 0: User, 1: Admin, 2: Super Admin
        },
        address: {
            type: String
        },
        phone: {
            type: String
        },
        city: {
            type: String
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
