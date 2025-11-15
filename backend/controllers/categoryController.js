const mongoose = require('mongoose');
const Category = require('../models/Category');
const { uploadImageOnCloudinary, deleteImageOnCloudinary } = require('../utils/cloudinary');

const normaliseCategory = (doc) => ({
  _id: doc._id.toString(),
  name: doc.name,
  slug: doc.slug,
  parentId: doc.parentId ? doc.parentId.toString() : null,
  picture: doc.picture
    ? {
        secure_url: doc.picture.secure_url,
        public_id: doc.picture.public_id,
        alt: doc.picture.alt || doc.name,
      }
    : null,
  image: doc.picture?.secure_url || doc.image || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  children: Array.isArray(doc.children) ? doc.children.map(normaliseCategory) : [],
});

const buildTree = (categories) => {
  const map = new Map();
  const roots = [];

  categories.forEach((category) => {
    map.set(category._id.toString(), { ...category, children: [] });
  });

  categories.forEach((category) => {
    const node = map.get(category._id.toString());
    if (category.parentId) {
      const parentNode = map.get(category.parentId.toString());
      if (parentNode) {
        parentNode.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const flattenTree = (nodes) => {
  const result = [];

  const walk = (items) => {
    items.forEach((item) => {
      const { children, ...rest } = item;
      result.push(rest);
      if (children && children.length > 0) {
        walk(children);
      }
    });
  };

  walk(nodes);
  return result;
};

const collectDescendants = async (categoryId) => {
  const result = new Set([categoryId.toString()]);
  const queue = [categoryId];

  while (queue.length > 0) {
    const current = queue.shift();
    // eslint-disable-next-line no-await-in-loop
    const children = await Category.find({ parentId: current }, '_id').lean();
    children.forEach(({ _id }) => {
      if (!result.has(_id.toString())) {
        result.add(_id.toString());
        queue.push(_id);
      }
    });
  }

  return Array.from(result);
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const parentPayload = req.body.parentId ?? req.body.parent ?? null;
    const parentId =
      parentPayload && !['root', 'null', 'undefined', ''].includes(parentPayload)
        ? parentPayload
        : null;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    let parent = null;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ success: false, message: 'Invalid parent category.' });
      }
      parent = await Category.findById(parentId);
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent category not found.' });
      }
    }

    let picture;

    if (req.file) {
      const { secure_url, public_id } = await uploadImageOnCloudinary(req.file.buffer, 'categories', {
        mimeType: req.file.mimetype,
      });
      picture = {
        secure_url,
        public_id,
        alt: req.body.imageAlt?.toString().trim() || name.trim(),
      };
    }

    const category = await Category.create({
      name: name.trim(),
      parentId: parent ? parent._id : null,
      picture,
    });

    return res.status(201).json({ success: true, data: normaliseCategory(category) });
  } catch (error) {
    console.error('createCategory error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create category.' });
  }
};

exports.listCategories = async (_req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 }).lean();
    const tree = buildTree(categories).map(normaliseCategory);
    const flat = flattenTree(tree);
    return res.json({ success: true, data: { tree, flat } });
  } catch (error) {
    console.error('listCategories error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch categories.' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const parentProvided = Object.prototype.hasOwnProperty.call(req.body, 'parentId')
      || Object.prototype.hasOwnProperty.call(req.body, 'parent');
    const parentField = req.body.parentId ?? req.body.parent;
    const removeImage = req.body.removeImage === 'true' || req.body.removeImage === true;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category id.' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    let updatedParent = category.parentId;

    if (parentProvided) {
      if (!parentField || parentField === 'root' || parentField === 'null' || parentField === 'undefined') {
        updatedParent = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(parentField)) {
          return res.status(400).json({ success: false, message: 'Invalid parent category.' });
        }
        const parent = await Category.findById(parentField);
        if (!parent) {
          return res.status(404).json({ success: false, message: 'Parent category not found.' });
        }
        if (parent._id.equals(category._id)) {
          return res.status(400).json({ success: false, message: 'Category cannot be its own parent.' });
        }
        const descendants = await collectDescendants(category._id);
        if (descendants.includes(parent._id.toString())) {
          return res.status(400).json({ success: false, message: 'Cannot assign a descendant as parent.' });
        }
        updatedParent = parent._id;
      }
    }

    if (name && name.trim()) {
      const trimmedName = name.trim();
      const previousName = category.name;
      category.name = trimmedName;
      if (category.picture?.alt && category.picture.alt === previousName) {
        category.picture.alt = trimmedName;
        category.markModified('picture');
      }
    }
    category.parentId = updatedParent;

    if (removeImage && category.picture?.public_id) {
      try {
        await deleteImageOnCloudinary(category.picture.public_id);
      } catch (cloudinaryError) {
        console.error('Error removing category image:', cloudinaryError);
      }
      category.picture = undefined;
      category.markModified('picture');
    }

    if (req.file) {
      if (category.picture?.public_id) {
        try {
          await deleteImageOnCloudinary(category.picture.public_id);
        } catch (cloudinaryError) {
          console.error('Error replacing category image:', cloudinaryError);
        }
      }
      const { secure_url, public_id } = await uploadImageOnCloudinary(req.file.buffer, 'categories', {
        mimeType: req.file.mimetype,
      });
      category.picture = {
        secure_url,
        public_id,
        alt: req.body.imageAlt?.toString().trim() || category.name,
      };
      category.markModified('picture');
    }

    await category.save();
    return res.json({ success: true, data: normaliseCategory(category) });
  } catch (error) {
    console.error('updateCategory error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update category.' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category id.' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const idsToDelete = await collectDescendants(category._id);
    const categoriesToDelete = await Category.find({ _id: { $in: idsToDelete } }, 'picture').lean();
    const imagesToDelete = categoriesToDelete
      .map((item) => item.picture?.public_id)
      .filter(Boolean);

    if (imagesToDelete.length > 0) {
      await Promise.all(
        imagesToDelete.map(async (publicId) => {
          try {
            await deleteImageOnCloudinary(publicId);
          } catch (cloudinaryError) {
            console.error(`Error deleting category image ${publicId}:`, cloudinaryError);
          }
        })
      );
    }

    await Category.deleteMany({ _id: { $in: idsToDelete } });

    return res.json({
      success: true,
      message: 'Category deleted successfully.',
      data: { deletedIds: idsToDelete },
    });
  } catch (error) {
    console.error('deleteCategory error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete category.' });
  }
};

