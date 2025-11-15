const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../models/Category');
const slugify = require('slugify');
const connectDB = require('../config/db');

dotenv.config();

// Dummy category data with placeholder images
const dummyCategories = [
  {
    name: 'Furniture',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 1
  },
  {
    name: 'Kitchen',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=400&h=400&fit=crop',
    position: 2
  },
  {
    name: 'Bedroom',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 3
  },
  {
    name: 'Living Room',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 4
  },
  {
    name: 'Bathroom',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=400&h=400&fit=crop',
    position: 5
  },
  {
    name: 'Office',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
    position: 6
  },
  {
    name: 'Outdoor',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
    position: 7
  },
  {
    name: 'Storage',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 8
  },
  {
    name: 'Lighting',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=400&h=400&fit=crop',
    position: 9
  },
  {
    name: 'Decor',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
    position: 10
  },
  {
    name: 'Textiles',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 11
  },
  {
    name: 'Kids',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=400&h=400&fit=crop',
    position: 12
  },
  {
    name: 'Plants',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
    position: 13
  },
  {
    name: 'Tools',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 14
  },
  {
    name: 'Appliances',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=400&h=400&fit=crop',
    position: 15
  },
  {
    name: 'Accessories',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
    position: 16
  },
  {
    name: 'Rugs',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 17
  },
  {
    name: 'Curtains',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=400&h=400&fit=crop',
    position: 18
  },
  {
    name: 'Mirrors',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
    position: 19
  },
  {
    name: 'Shelving',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 20
  },
  {
    name: 'Tables',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=400&h=400&fit=crop',
    position: 21
  },
  {
    name: 'Chairs',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
    position: 22
  },
  {
    name: 'Sofas',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 23
  },
  {
    name: 'Beds',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=400&h=400&fit=crop',
    position: 24
  },
  {
    name: 'Wardrobes',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
    position: 25
  },
  {
    name: 'Cabinets',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    position: 26
  },
  {
    name: 'Desks',
    image: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e4?w=400&h=400&fit=crop',
    position: 27
  },
  {
    name: 'Lamps',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
    position: 28
  }
];

const seedCategories = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database');

    // Clear existing categories (optional - comment out if you want to keep existing)
    // await Category.deleteMany({});
    // console.log('Cleared existing categories');

    // Check if categories already exist
    const existingCategories = await Category.find();
    if (existingCategories.length > 0) {
      console.log(`Found ${existingCategories.length} existing categories. Skipping seed.`);
      console.log('To reseed, delete existing categories first or modify the script.');
      process.exit(0);
    }

    // Insert dummy categories
    const categoriesToInsert = dummyCategories.map(cat => ({
      name: cat.name.toLowerCase(),
      slug: slugify(cat.name, { lower: true, strict: true }),
      picture: {
        secure_url: cat.image,
        public_id: `dummy-category-${slugify(cat.name, { lower: true, strict: true })}`
      },
      position: cat.position
    }));

    const insertedCategories = await Category.insertMany(categoriesToInsert);
    console.log(`✅ Successfully seeded ${insertedCategories.length} categories!`);
    console.log('\nCategories created:');
    insertedCategories.forEach(cat => {
      console.log(`  - ${cat.name} (position: ${cat.position})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

// Run the seed function
seedCategories();

