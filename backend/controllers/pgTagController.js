const slugify = require('slugify');
const tagModel = require('../models/postgres/tagModel');

const getTags = async (req, res) => {
  try {
    let { page = 1, limit = 20, sort = 'name', order = 'asc', search, isActive } = req.query;
    page = Number(page) || 1;
    limit = limit === 'all' ? 0 : Number(limit) || 20;

    const { tags, total } = await tagModel.list({ search, isActive, sort, order, page, limit });

    const tagsWithUsage = await Promise.all(
      tags.map(async (tag) => ({ ...tag, usageCount: await getUsageCount(tag.name) }))
    );

    return res.status(200).json({
      success: true,
      message: 'Tags fetched successfully',
      data: tagsWithUsage,
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
};

const createTag = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tag name is required' });
    }

    const slug = slugify(name, { lower: true, strict: true });
    const existing = await tagModel.findByNameOrSlug(name, slug);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tag with this name already exists' });
    }

    const tag = await tagModel.create({
      name,
      description: req.body.description,
      color: req.body.color,
      isActive: typeof req.body.isActive === 'boolean' || ['true', 'false'].includes(req.body.isActive)
        ? req.body.isActive === true || req.body.isActive === 'true'
        : undefined,
      createdBy: req.user?._id?.toString(),
    });

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
};

const updateTag = async (req, res) => {
  try {
    const { id } = req.params;

    const fields = {};
    if (req.body.name !== undefined) fields.name = req.body.name.trim();
    if (req.body.description !== undefined) fields.description = req.body.description || '';
    if (req.body.color !== undefined) fields.color = req.body.color || null;
    if (typeof req.body.isActive === 'boolean' || ['true', 'false'].includes(req.body.isActive)) {
      fields.isActive = req.body.isActive === true || req.body.isActive === 'true';
    }
    fields.updatedBy = req.user?._id?.toString();

    if (fields.name) {
      const slug = slugify(fields.name, { lower: true, strict: true });
      const duplicate = await tagModel.findByNameOrSlug(fields.name, slug, id);
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Another tag with this name already exists' });
      }
    }

    const tag = await tagModel.update(id, fields);
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
};

const toggleTag = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await tagModel.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    const tag = await tagModel.update(id, {
      isActive: !existing.isActive,
      updatedBy: req.user?._id?.toString(),
    });

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
};

const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await tagModel.findById(id);
    if (!tag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    const usageCount = await getUsageCount(tag.name);
    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tag that is assigned to products. Remove tag from products first.',
      });
    }

    await tagModel.remove(id);

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
};

module.exports = {
  getTags,
  createTag,
  updateTag,
  toggleTag,
  deleteTag,
};
