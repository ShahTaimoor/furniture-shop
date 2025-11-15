const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: function() {
                return !this.email && !this.phone; // At least name, email, or phone required
            },
            trim: true,
            sparse: true
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            sparse: true,
            index: true,
            validate: {
                validator: function(v) {
                    return !v || /^\S+@\S+\.\S+$/.test(v);
                },
                message: 'Please provide a valid email'
            }
        },
        phone: {
            type: String,
            trim: true,
            sparse: true,
            index: true
        },
        password: {
            type: String,
            required: function() {
                // Password not required for social logins
                return !this.socialAuth || !this.socialAuth.provider;
            },
            minLength: 6,
            select: false // Don't include password by default
        },
        role: {
            type: Number,
            default: 0,
            enum: [0, 1, 2] // 0: User, 1: Admin, 2: Super Admin
        },
        // Legacy fields for backward compatibility
        address: {
            type: String
        },
        city: {
            type: String
        },
        // Social authentication
        socialAuth: {
            provider: {
                type: String,
                enum: ['google', 'facebook', 'apple'],
                default: undefined,
                sparse: true
            },
            socialId: {
                type: String,
                sparse: true,
                default: undefined
            },
            accessToken: {
                type: String,
                select: false
            }
        },
        // Profile management
        profile: {
            firstName: { type: String, trim: true },
            lastName: { type: String, trim: true },
            dateOfBirth: { type: Date },
            gender: { type: String, enum: ['male', 'female', 'other', null] },
            avatar: {
                secure_url: { type: String },
                public_id: { type: String }
            },
            bio: { type: String, maxlength: 500 }
        },
        // Account status
        isActive: {
            type: Boolean,
            default: true
        },
        isBlacklisted: {
            type: Boolean,
            default: false
        },
        emailVerified: {
            type: Boolean,
            default: false
        },
        phoneVerified: {
            type: Boolean,
            default: false
        },
        // Email verification token
        emailVerificationToken: {
            type: String,
            select: false
        },
        emailVerificationExpires: {
            type: Date,
            select: false
        },
        // Password reset
        passwordResetToken: {
            type: String,
            select: false
        },
        passwordResetExpires: {
            type: Date,
            select: false
        },
        // Preferences
        preferences: {
            emailNotifications: { type: Boolean, default: true },
            smsNotifications: { type: Boolean, default: true },
            marketingEmails: { type: Boolean, default: false },
            language: { type: String, default: 'en' },
            currency: { type: String, default: 'USD' }
        },
        // Last login tracking
        lastLogin: {
            type: Date
        },
        // Login attempts for security
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: {
            type: Date
        }
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ 'socialAuth.provider': 1, 'socialAuth.socialId': 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    if (this.profile?.firstName || this.profile?.lastName) {
        return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
    }
    return this.name || this.email || this.phone || 'User';
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only hash password if it's modified and user is not from social auth
    if (!this.isModified('password') || (this.socialAuth && this.socialAuth.provider)) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) {
        return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }
    const updates = { $inc: { loginAttempts: 1 } };
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
    return this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
};

module.exports = mongoose.model('User', userSchema);
