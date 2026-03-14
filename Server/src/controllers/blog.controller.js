const Blog = require('../models/Blog.model');
const { toSlug } = require('../utils/slug.util');
const { getPagination } = require('../utils/pagination.util');
const { uploadImage, deleteImage } = require('../config/cloudinary.config');

// ─── Public: List published blogs ───────────────────────────────────────────

const listBlogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { category, featured } = req.query;

    const filter = { status: 'published' };
    if (category && String(category).trim()) {
      filter.category = { $regex: String(category).trim(), $options: 'i' };
    }
    if (typeof featured === 'string') {
      filter.featured = featured.toLowerCase() === 'true';
    }

    const [items, total] = await Promise.all([
      Blog.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(filter),
    ]);

    return res.json({
      status: 'success',
      data: items.map(normalizeBlog),
      meta: {
        page,
        limit,
        total,
        hasNextPage: skip + items.length < total,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// ─── Public: Get blog by slug ────────────────────────────────────────────────

const getBlogBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({ slug, status: 'published' }).lean();
    if (!blog) {
      return res.status(404).json({ status: 'error', message: 'Blog not found' });
    }
    return res.json({ status: 'success', data: normalizeBlog(blog) });
  } catch (err) {
    return next(err);
  }
};

// ─── Public: Get related blogs ───────────────────────────────────────────────

const getRelatedBlogs = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const current = await Blog.findOne({ slug, status: 'published' }).lean();
    if (!current) {
      return res.status(404).json({ status: 'error', message: 'Blog not found' });
    }

    const filter = {
      status: 'published',
      slug: { $ne: slug },
    };
    if (current.category) {
      filter.category = { $regex: current.category, $options: 'i' };
    }

    const items = await Blog.find(filter)
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();

    return res.json({ status: 'success', data: items.map(normalizeBlog) });
  } catch (err) {
    return next(err);
  }
};

// ─── Admin: List all blogs ───────────────────────────────────────────────────

const adminListBlogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
    const { q, status, featured, category } = req.query;

    const filter = {};
    if (status && ['draft', 'published'].includes(status)) {
      filter.status = status;
    }
    if (typeof featured === 'string') {
      filter.featured = featured.toLowerCase() === 'true';
    }
    if (category && String(category).trim()) {
      filter.category = { $regex: String(category).trim(), $options: 'i' };
    }
    if (q && String(q).trim()) {
      filter.$or = [
        { title: { $regex: String(q).trim(), $options: 'i' } },
        { slug: { $regex: String(q).trim(), $options: 'i' } },
        { category: { $regex: String(q).trim(), $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Blog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(filter),
    ]);

    return res.json({
      status: 'success',
      data: items.map(normalizeBlog),
      meta: {
        page,
        limit,
        total,
        hasNextPage: skip + items.length < total,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// ─── Admin: Get blog by ID ───────────────────────────────────────────────────

const adminGetBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id).lean();
    if (!blog) {
      return res.status(404).json({ status: 'error', message: 'Blog not found' });
    }
    return res.json({ status: 'success', data: normalizeBlog(blog) });
  } catch (err) {
    return next(err);
  }
};

// ─── Admin: Create blog ──────────────────────────────────────────────────────

const adminCreateBlog = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    // Auto-generate slug from title
    if (!payload.slug && payload.title) {
      payload.slug = toSlug(payload.title);
    } else if (payload.slug) {
      payload.slug = toSlug(payload.slug);
    }

    // Parse tags if sent as a comma-separated string
    if (typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Set publishedAt if creating as published
    if (payload.status === 'published' && !payload.publishedAt) {
      payload.publishedAt = new Date();
    }

    const created = await Blog.create(payload);
    const obj = created.toObject({ versionKey: false });
    return res.status(201).json({ status: 'success', data: normalizeBlog(obj) });
  } catch (err) {
    return next(err);
  }
};

// ─── Admin: Update blog ──────────────────────────────────────────────────────

const adminUpdateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    // Images are managed via dedicated endpoints
    delete payload.coverImage;
    delete payload.bannerImage;

    if (payload.slug) {
      payload.slug = toSlug(payload.slug);
    }

    if (typeof payload.tags === 'string') {
      payload.tags = payload.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const updated = await Blog.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Blog not found' });
    }
    const obj = updated.toObject({ versionKey: false });
    return res.json({ status: 'success', data: normalizeBlog(obj) });
  } catch (err) {
    return next(err);
  }
};

// ─── Admin: Delete blog ──────────────────────────────────────────────────────

const adminDeleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ status: 'error', message: 'Blog not found' });
    }

    const obj = blog.toObject({ versionKey: false });
    await blog.deleteOne();

    // Best-effort Cloudinary cleanup
    const publicIds = [blog.coverImage?.publicId, blog.bannerImage?.publicId].filter(Boolean);
    await Promise.all(
      publicIds.map(async (publicId) => {
        try { await deleteImage(publicId); } catch { /* ignore */ }
      })
    );

    return res.json({ status: 'success', data: normalizeBlog(obj) });
  } catch (err) {
    return next(err);
  }
};

// ─── Admin: Toggle publish status ───────────────────────────────────────────

const adminTogglePublish = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ status: 'error', message: 'Blog not found' });
    }

    const newStatus = blog.status === 'published' ? 'draft' : 'published';
    blog.status = newStatus;
    if (newStatus === 'published' && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }
    await blog.save();
    const obj = blog.toObject({ versionKey: false });
    return res.json({ status: 'success', data: normalizeBlog(obj) });
  } catch (err) {
    return next(err);
  }
};

// ─── Admin: Toggle featured ───────────────────────────────────────────────────

const adminToggleFeatured = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ status: 'error', message: 'Blog not found' });
    }
    blog.featured = !blog.featured;
    await blog.save();
    const obj = blog.toObject({ versionKey: false });
    return res.json({ status: 'success', data: normalizeBlog(obj) });
  } catch (err) {
    return next(err);
  }
};

// ─── Admin: Upload cover image ───────────────────────────────────────────────

const adminUploadCoverImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ status: 'error', message: 'Blog not found' });
    }

    const oldPublicId = blog.coverImage?.publicId;
    const uploaded = await uploadImage(req.file, 'og-gainz/blogs/covers');
    blog.coverImage = { url: uploaded.url, publicId: uploaded.publicId };
    await blog.save();

    if (oldPublicId) {
      try { await deleteImage(oldPublicId); } catch { /* ignore */ }
    }

    const obj = blog.toObject({ versionKey: false });
    return res.json({ status: 'success', data: normalizeBlog(obj) });
  } catch (err) {
    return next(err);
  }
};

// ─── Admin: Upload banner image ──────────────────────────────────────────────

const adminUploadBannerImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ status: 'error', message: 'Blog not found' });
    }

    const oldPublicId = blog.bannerImage?.publicId;
    const uploaded = await uploadImage(req.file, 'og-gainz/blogs/banners');
    blog.bannerImage = { url: uploaded.url, publicId: uploaded.publicId };
    await blog.save();

    if (oldPublicId) {
      try { await deleteImage(oldPublicId); } catch { /* ignore */ }
    }

    const obj = blog.toObject({ versionKey: false });
    return res.json({ status: 'success', data: normalizeBlog(obj) });
  } catch (err) {
    return next(err);
  }
};

// ─── Normalizer ───────────────────────────────────────────────────────────────

const normalizeBlog = (blog) => {
  if (!blog) return blog;
  return {
    ...blog,
    id: String(blog._id || blog.id || ''),
  };
};

module.exports = {
  listBlogs,
  getBlogBySlug,
  getRelatedBlogs,
  adminListBlogs,
  adminGetBlog,
  adminCreateBlog,
  adminUpdateBlog,
  adminDeleteBlog,
  adminTogglePublish,
  adminToggleFeatured,
  adminUploadCoverImage,
  adminUploadBannerImage,
};
