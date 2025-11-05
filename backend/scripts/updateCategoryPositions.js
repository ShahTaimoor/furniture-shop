const mongoose = require('mongoose');
const Category = require('../models/Category');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Update existing categories with position numbers
const updateCategoryPositions = async () => {
    try {
        // Get all categories sorted by creation date
        const categories = await Category.find().sort({ createdAt: 1 });
        
        console.log(`Found ${categories.length} categories to update`);
        
        // Update each category with a position number
        for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            const newPosition = i + 1;
            
            await Category.findByIdAndUpdate(
                category._id,
                { position: newPosition },
                { new: true }
            );
            
            console.log(`Updated ${category.name} to position ${newPosition}`);
        }
        
        console.log('All categories updated with position numbers');
        
        // Verify the update
        const updatedCategories = await Category.find().sort({ position: 1 });
        console.log('\nCategories after update (sorted by position):');
        updatedCategories.forEach(cat => {
            console.log(`Position ${cat.position}: ${cat.name}`);
        });
        
    } catch (error) {
        console.error('Error updating category positions:', error);
    }
};

// Run the update
const runUpdate = async () => {
    await connectDB();
    await updateCategoryPositions();
    await mongoose.connection.close();
    console.log('Database connection closed');
};

// Run if this file is executed directly
if (require.main === module) {
    runUpdate();
}

module.exports = { updateCategoryPositions };
