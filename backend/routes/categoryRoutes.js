const express = require('express');
const Category = require('../models/Category');
const slugify = require('slugify');
const { isAuthorized, isAdmin, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');
const { uploadImageOnCloudinary, deleteImageOnCloudinary } = require('../utils/cloudinary');

const router = express.Router();

// Helper function to normalize positions (1, 2, 3, 4...)
const normalizePositions = async () => {
    try {
        const categories = await Category.find().sort({ position: 1, createdAt: 1 });
        for (let i = 0; i < categories.length; i++) {
            const expectedPosition = i + 1;
            if (categories[i].position !== expectedPosition) {
                await Category.findByIdAndUpdate(categories[i]._id, { position: expectedPosition });
            }
        }
    } catch (error) {
        console.error('Error normalizing positions:', error);
    }
};

// Create category
router.post('/create-category', upload.single('picture'), isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
    try {
        const { name } = req.body;


        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const existingCategory = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }

        const { secure_url, public_id } = await uploadImageOnCloudinary(req.file.buffer, 'products');

        if (!secure_url || !public_id) {
            return res.status(500).json({
                success: false,
                message: 'Cloudinary upload failed'
            });
        }

        // Get the highest position number and increment by 1
        const lastCategory = await Category.findOne().sort({ position: -1 });
        const newPosition = lastCategory ? lastCategory.position + 1 : 1;

        const newCategory = await Category.create({
            name,
            slug: slugify(name, { lower: true, strict: true }),
            picture: { secure_url, public_id },
            position: newPosition
        });

        // Normalize positions after creation
        await normalizePositions();
        
        return res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: newCategory,
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, message: 'Server error while creating category' });
    }
});

// Update category
router.put('/update-category/:slug', upload.single('picture'), isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
    try {
        const { name, position } = req.body;
        const { slug } = req.params;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        // If position is being updated, handle position conflicts by swapping
        if (position !== undefined) {
            const newPosition = parseInt(position);
            const existingCategoryWithPosition = await Category.findOne({ 
                position: newPosition, 
                slug: { $ne: slug } 
            });
            
            // Get the current category to find its current position
            const currentCategory = await Category.findOne({ slug });
            const currentPosition = currentCategory?.position;
            
            if (existingCategoryWithPosition) {
                // Swap positions: move the conflicting category to the current category's position
                await Category.findOneAndUpdate(
                    { _id: existingCategoryWithPosition._id },
                    { position: currentPosition || newPosition + 1000 } // Use high number if no current position
                );
            }
        }

        const updateData = {
            name,
            slug: slugify(name, { lower: true, strict: true }),
        };

        if (position !== undefined) {
            updateData.position = parseInt(position);
        }

        let updatedCategory = await Category.findOneAndUpdate(
            { slug },
            updateData,
            { new: true }
        );
        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Handle image update
        if (req.file) {
            const { secure_url, public_id } = await uploadImageOnCloudinary(req.file.buffer, 'products');

            // Delete old image from Cloudinary if exists
            if (updatedCategory.picture && updatedCategory.picture.public_id) {
                await deleteImageOnCloudinary(updatedCategory.picture.public_id);
            }

            updatedCategory.picture = { secure_url, public_id };
        }


        updatedCategory = await updatedCategory.save();
        
        // Normalize positions to ensure they are sequential (1, 2, 3, 4...)
        await normalizePositions();
        
        return res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: updatedCategory,
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ success: false, message: 'Server error while updating category' });
    }
});

// Delete ategory
router.delete('/delete-category/:slug', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
    try {
        const { slug } = req.params;
        const deletedCategory = await Category.findOneAndDelete({ slug });
        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        if (deletedCategory.picture && deletedCategory.picture.public_id) {
            await deleteImageOnCloudinary(deletedCategory.picture.public_id);
        }
        
        // Normalize positions after deletion
        await normalizePositions();
        
        return res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            data: deletedCategory
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting category' });
    }
});

// Get all categori
router.get('/all-category', async (req, res) => {
    try {
        const categories = await Category.find().sort({ position: 1, createdAt: -1 });
        if (!categories.length) {
            return res.status(404).json({ success: false, message: 'No categories found' });
        }

        const newCategoryArray = categories.map((category) => {
            const categoryObj = category.toObject();
            categoryObj.image = categoryObj.picture?.secure_url || null;
            delete categoryObj.picture;
            return categoryObj;
        });

        return res.status(200).json({
            success: true,
            message: 'Categories fetched successfully',
            data: newCategoryArray
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching categories' });
    }
});

// Get single category
router.get('/single-category/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const category = await Category.findOne({ slug });
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        return res.status(200).json({
            success: true,
            message: 'Single category fetched successfully',
            data: { category }
        });
    } catch (error) {
        console.error('Error fetching single category:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching single category' });
    }
});



module.exports = router;
