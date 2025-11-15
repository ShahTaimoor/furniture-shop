const express = require('express');
const slugify = require('slugify');
const mongoose = require('mongoose');
const Tag = require('../models/Tag');
const Product = require('../models/Product');
const { isAuthorized, isAdminOrSuperAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const buildTagQuery = (queryParams) => {
  const { search, isActive } = queryParams;
  const query = {};

  if (search && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { slug: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (isActive === 'true') {
    query.isActive = true;
  } else if (isActive === 'false') {
    query.isActive = false;
  }

  return query;
};

const normalizeTagPayload = (body, userId) => {
  const payload = {};
  if (body.name) {
    payload.name = body.name.trim();
    payload.slug = slugify(payload.name, { lower: true, strict: true });
  }
  if (body.description !== undefined) {
    payload.description = body.description || '';
  }
  if (body.color !== undefined) {
    payload.color = body.color || null;
  }
  if (typeof body.isActive === 'boolean' || ['true', 'false'].includes(body.isActive)) {
    payload.isActive = body.isActive === true || body.isActive === 'true';
  }
  if (userId) {
    payload.updatedBy = userId;
    if (!body._id) {
      payload.createdBy = userId;
    }
  }
  return payload;
};

router.get('/tags', async (req, res) => {
  try {
    let { page = 1, limit = 20, sort = 'name', order = 'asc' } = req.query;
    page = Number(page) || 1;
    limit = limit === 'all' ? 0 : Number(limit) || 20;

    const query = buildTagQuery(req.query);

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortMap = {
      name: { name: sortOrder },
      createdAt: { createdAt: sortOrder },
      updatedAt: { updatedAt: sortOrder },
      usage: { usageCount: sortOrder },
    };

    const sortObject = sortMap[sort] || sortMap.name;

    const [tags, total] = await Promise.all([
      Tag.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'tags',
            as: 'products',
          },
        },
        {
          $addFields: {
            usageCount: { $size: '$products' },
          },
        },
        { $project: { products: 0 } },
        { $sort: sortObject },
        ...(limit
          ? [
              { $skip: (page - 1) * limit },
              { $limit: limit },
            ]
          : []),
      ]),
      Tag.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Tags fetched successfully',
      data: tags,
      pagination: {
        total,
        page,
        limit: limit || total,
        totalPages: limit ? Math.ceil(total / limit) || 1 : 1,
      },
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tags',
      error: error.message,
    });
  }
});

router.post('/tags', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const payload = normalizeTagPayload(req.body, req.user?._id);

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Tag name is required',
      });
    }

    const existing = await Tag.findOne({
      $or: [
        { name: { $regex: `^${payload.name}$`, $options: 'i' } },
        { slug: payload.slug },
      ],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Tag with this name already exists',
      });
    }

    const tag = await Tag.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      tag,
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating tag',
      error: error.message,
    });
  }
});

router.put('/tags/:id', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tag id' });
    }

    const payload = normalizeTagPayload({ ...req.body, _id: id }, req.user?._id);

    if (payload.name) {
      const duplicate = await Tag.findOne({
        _id: { $ne: id },
        $or: [
          { name: { $regex: `^${payload.name}$`, $options: 'i' } },
          { slug: payload.slug },
        ],
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Another tag with this name already exists',
        });
      }
    }

    const tag = await Tag.findByIdAndUpdate(id, payload, { new: true });

    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Tag updated successfully',
      tag,
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating tag',
      error: error.message,
    });
  }
});

router.patch('/tags/:id/toggle', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tag id' });
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    tag.isActive = !tag.isActive;
    tag.updatedBy = req.user?._id;
    await tag.save();

    return res.status(200).json({
      success: true,
      message: `Tag ${tag.isActive ? 'activated' : 'deactivated'} successfully`,
      tag,
    });
  } catch (error) {
    console.error('Error toggling tag status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling tag status',
      error: error.message,
    });
  }
});

router.delete('/tags/:id', isAuthorized, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid tag id' });
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    const productCount = await Product.countDocuments({ tags: tag._id, isDeleted: false });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tag that is assigned to products. Remove tag from products first.',
      });
    }

    await Tag.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Tag deleted successfully',
      data: { _id: id },
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting tag',
      error: error.message,
    });
  }
});

module.exports = router;

