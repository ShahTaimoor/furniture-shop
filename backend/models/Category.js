const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        trim: true,
        required: true,
        lowercase: true
    },
    slug: {
        type: String,
        unique: true,
        required: true,
        lowercase: true
    },
    picture: {
        secure_url: {
            type: String,
            required: true
        },
        public_id: {
            type: String,
            required: true
        },
    },
    position: {
        type: Number,
        default: 0
    }

}, { timestamps: true })

module.exports = mongoose.model('Category', categorySchema);