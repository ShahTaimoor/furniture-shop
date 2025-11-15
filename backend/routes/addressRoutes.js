const express = require('express');
const Address = require('../models/Address');
const { isAuthorized } = require('../middleware/authMiddleware');
const router = express.Router();

// All routes require authentication
router.use(isAuthorized);

// Get all addresses for logged-in user
router.get('/addresses', async (req, res) => {
    try {
        const addresses = await Address.find({ 
            user: req.user.userId,
            isActive: true 
        }).sort({ isDefault: -1, createdAt: -1 });

        res.json({
            success: true,
            addresses
        });
    } catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch addresses'
        });
    }
});

// Get single address by ID
router.get('/addresses/:id', async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            user: req.user.userId,
            isActive: true
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        res.json({
            success: true,
            address
        });
    } catch (error) {
        console.error('Get address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch address'
        });
    }
});

// Create new address
router.post('/addresses', async (req, res) => {
    try {
        const {
            type,
            fullName,
            phone,
            altPhone,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country,
            deliveryInstructions,
            landmark,
            coordinates,
            isDefault
        } = req.body;

        // Validation
        if (!fullName || !phone || !addressLine1 || !city || !country) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const addressData = {
            user: req.user.userId,
            type: type || 'home',
            fullName,
            phone,
            altPhone,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country: country || 'Pakistan',
            deliveryInstructions,
            landmark,
            coordinates,
            isDefault: isDefault || false
        };

        const address = await Address.create(addressData);

        res.status(201).json({
            success: true,
            message: 'Address created successfully',
            address
        });
    } catch (error) {
        console.error('Create address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create address'
        });
    }
});

// Update address
router.put('/addresses/:id', async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            user: req.user.userId
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        const updateFields = [
            'type', 'fullName', 'phone', 'altPhone', 'addressLine1', 'addressLine2',
            'city', 'state', 'postalCode', 'country', 'deliveryInstructions',
            'landmark', 'coordinates', 'isDefault'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                address[field] = req.body[field];
            }
        });

        await address.save();

        res.json({
            success: true,
            message: 'Address updated successfully',
            address
        });
    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update address'
        });
    }
});

// Delete address (soft delete)
router.delete('/addresses/:id', async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            user: req.user.userId
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        address.isActive = false;
        await address.save();

        res.json({
            success: true,
            message: 'Address deleted successfully'
        });
    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete address'
        });
    }
});

// Set default address
router.patch('/addresses/:id/set-default', async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            user: req.user.userId,
            isActive: true
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        address.isDefault = true;
        await address.save();

        res.json({
            success: true,
            message: 'Default address updated successfully',
            address
        });
    } catch (error) {
        console.error('Set default address error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set default address'
        });
    }
});

module.exports = router;

