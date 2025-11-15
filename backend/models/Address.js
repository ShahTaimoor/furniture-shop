const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        // Address type (home, work, other)
        type: {
            type: String,
            enum: ['home', 'work', 'other'],
            default: 'home'
        },
        // Contact person name
        fullName: {
            type: String,
            required: true,
            trim: true
        },
        // Phone number for delivery
        phone: {
            type: String,
            required: true,
            trim: true
        },
        // Alternative phone (optional)
        altPhone: {
            type: String,
            trim: true
        },
        // Address line 1
        addressLine1: {
            type: String,
            required: true,
            trim: true
        },
        // Address line 2 (optional)
        addressLine2: {
            type: String,
            trim: true
        },
        // City
        city: {
            type: String,
            required: true,
            trim: true
        },
        // State/Province
        state: {
            type: String,
            trim: true
        },
        // Postal/ZIP code
        postalCode: {
            type: String,
            trim: true
        },
        // Country
        country: {
            type: String,
            required: true,
            trim: true,
            default: 'Pakistan'
        },
        // Delivery instructions
        deliveryInstructions: {
            type: String,
            maxlength: 500,
            trim: true
        },
        // Is default address
        isDefault: {
            type: Boolean,
            default: false
        },
        // Landmark (optional)
        landmark: {
            type: String,
            trim: true
        },
        // Address coordinates (optional, for maps)
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number }
        },
        // Address status
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Indexes
addressSchema.index({ user: 1, isActive: 1 });
addressSchema.index({ user: 1, isDefault: 1 });

// Middleware to ensure only one default address per user
addressSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        // Set all other addresses of this user to not default
        await mongoose.model('Address').updateMany(
            { user: this.user, _id: { $ne: this._id } },
            { $set: { isDefault: false } }
        );
    }
    // If this is the first address for the user, make it default
    if (!this.isModified('isDefault') || !this.isDefault) {
        const addressCount = await mongoose.model('Address').countDocuments({ user: this.user });
        if (addressCount === 0) {
            this.isDefault = true;
        }
    }
    next();
});

// Method to get full address string
addressSchema.methods.getFullAddress = function() {
    const parts = [
        this.addressLine1,
        this.addressLine2,
        this.city,
        this.state,
        this.postalCode,
        this.country
    ].filter(Boolean);
    return parts.join(', ');
};

module.exports = mongoose.model('Address', addressSchema);

