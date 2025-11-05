const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // First, establish the connection
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
        
        // Check if the 'email_1' index exists
        const indexes = await mongoose.connection.db.collection('users').indexes();
        const emailIndex = indexes.find(index => index.name === 'email_1');
        
        // If the index exists, drop it
        if (emailIndex) {
            const result = await mongoose.connection.db.collection('users').dropIndex('email_1');
            console.log('Email index dropped successfully', result);
        } else {
            console.log('Email index does not exist');
        }
    } catch (error) {
        console.error('MongoDB connection failed', error);
    }
};

module.exports = connectDB;
