const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    title: {
        type: String,
       
        trim: true
    },
    description: {
        type: String,
        
    },
    price: {
        type: Number,
    
    },
    stock: {
        type: Number,
    
        default: 0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        
    },

    picture: {
        secure_url: {
            type: String,
            
        },
        public_id: {
            type: String,
            
        },
    },


    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        
    },



}, { timestamps: true })

// Create text indexes for better search performance
productSchema.index({ 
  title: 'text', 
  description: 'text' 
}, {
  weights: {
    title: 10,  // Title matches are more important
    description: 5  // Description matches are less important
  },
  name: 'product_search_index'
});

// Create compound indexes for common queries
productSchema.index({ category: 1, stock: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema)