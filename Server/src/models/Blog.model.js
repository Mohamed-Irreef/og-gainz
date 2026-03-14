const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, required: false, trim: true },
  },
  { _id: false }
);

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    excerpt: { type: String, required: false, trim: true },
    content: { type: String, required: false },

    coverImage: { type: ImageSchema, required: false },
    bannerImage: { type: ImageSchema, required: false },

    authorName: { type: String, required: false, trim: true },
    authorImage: { type: String, required: false, trim: true },

    category: { type: String, required: false, trim: true, index: true },
    tags: { type: [String], required: false, default: undefined },

    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },

    featured: { type: Boolean, default: false, index: true },

    readingTime: { type: Number, required: false, min: 0 },

    publishedAt: { type: Date, required: false, index: true },
  },
  { timestamps: true }
);

BlogSchema.index({ slug: 1 }, { unique: true });
BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ featured: 1, status: 1 });
BlogSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('Blog', BlogSchema);
