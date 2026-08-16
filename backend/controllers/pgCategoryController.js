const categoryModel = require('../models/postgres/categoryModel');
const { uploadImageOnCloudinary, deleteImageOnCloudinary } = require('../utils/cloudinary');

const normaliseCategory = (doc) => ({
  _id: doc._id,
  name: doc.name,
  slug: doc.slug,
  parentId: doc.parentId || null,
  picture: doc.picture,
  image: doc.picture?.secure_url || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  children: Array.isArray(doc.children) ? doc.children.map(normaliseCategory) : [],
});

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

const createCategory = async (req, res) => {
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

    if (parentId) {
      const parent = await categoryModel.findById(parentId);
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

    const category = await categoryModel.create({ name: name.trim(), parentId, picture });

    return res.status(201).json({ success: true, data: normaliseCategory(category) });
  } catch (error) {
    console.error('pg createCategory error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create category.' });
  }
};

const listCategories = async (_req, res) => {
  try {
    const categories = await categoryModel.findAll();
    const tree = categoryModel.buildTree(categories).map(normaliseCategory);
    const flat = flattenTree(tree);

    return res.json({ success: true, data: { tree, flat } });
  } catch (error) {
    console.error('pg listCategories error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch categories.' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const parentProvided = Object.prototype.hasOwnProperty.call(req.body, 'parentId')
      || Object.prototype.hasOwnProperty.call(req.body, 'parent');
    const parentField = req.body.parentId ?? req.body.parent;
    const removeImage = req.body.removeImage === 'true' || req.body.removeImage === true;

    const existing = await categoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    let updatedParent = existing.parentId;

    if (parentProvided) {
      if (!parentField || parentField === 'root' || parentField === 'null' || parentField === 'undefined') {
        updatedParent = null;
      } else {
        if (parentField === id) {
          return res.status(400).json({ success: false, message: 'Category cannot be its own parent.' });
        }
        const parent = await categoryModel.findById(parentField);
        if (!parent) {
          return res.status(404).json({ success: false, message: 'Parent category not found.' });
        }
        const descendants = await categoryModel.collectDescendantIds(id);
        if (descendants.includes(parentField)) {
          return res.status(400).json({ success: false, message: 'Cannot assign a descendant as parent.' });
        }
        updatedParent = parentField;
      }
    }

    let picture;
    if (req.file) {
      if (existing.picture?.public_id) {
        try {
          await deleteImageOnCloudinary(existing.picture.public_id);
        } catch (cloudinaryError) {
          console.error('Error replacing category image:', cloudinaryError);
        }
      }
      const { secure_url, public_id } = await uploadImageOnCloudinary(req.file.buffer, 'categories', {
        mimeType: req.file.mimetype,
      });
      picture = {
        secure_url,
        public_id,
        alt: req.body.imageAlt?.toString().trim() || (name?.trim() || existing.name),
      };
    } else if (removeImage && existing.picture?.public_id) {
      try {
        await deleteImageOnCloudinary(existing.picture.public_id);
      } catch (cloudinaryError) {
        console.error('Error removing category image:', cloudinaryError);
      }
    }

    const updated = await categoryModel.update(id, {
      name,
      parentId: updatedParent,
      picture,
      removeImage,
    });

    return res.json({ success: true, data: normaliseCategory(updated) });
  } catch (error) {
    console.error('pg updateCategory error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update category.' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await categoryModel.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const idsToDelete = await categoryModel.collectDescendantIds(id);

    const imagesToDelete = [];
    for (const descendantId of idsToDelete) {
      // eslint-disable-next-line no-await-in-loop
      const descendant = await categoryModel.findById(descendantId);
      if (descendant?.picture?.public_id) {
        imagesToDelete.push(descendant.picture.public_id);
      }
    }

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

    await categoryModel.deleteByIds(idsToDelete);

    return res.json({
      success: true,
      message: 'Category deleted successfully.',
      data: { deletedIds: idsToDelete },
    });
  } catch (error) {
    console.error('pg deleteCategory error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete category.' });
  }
};

module.exports = {
  createCategory,
  listCategories,
  updateCategory,
  deleteCategory,
};
