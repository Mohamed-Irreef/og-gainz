import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { blogService } from '@/services/blogService';
import type { Blog } from '@/services/adminBlogService';
import { formatDate } from '@/utils/dateUtils';

export default function BlogList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const hasNextPage = useRef(false);

  // We could fetch a dynamic list of active categories here, 
  // but for simplicity, we'll derive it from the returned blogs initially, 
  // or just use some common ones. 
  const commonCategories = ['Nutrition', 'Workout', 'Lifestyle', 'Recipe'];

  useEffect(() => {
    setLoading(true);
    blogService.list({ page, limit: 12, category })
      .then((res) => {
        setBlogs(res.data);
        hasNextPage.current = Boolean(res.meta?.hasNextPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(() => {
        setBlogs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, category]);

  return (
    <div className="min-h-screen bg-oz-neutral/5 pb-24">
      {/* Header Section */}
      <section className="bg-white border-b border-border py-16 lg:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-oz-primary tracking-tight">
              The OG Gainz <span className="text-oz-accent">Blog</span>
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Nutrition strategies, fitness guides, and healthy living tips directly from our experts.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar / Filters (Desktop) */}
          <div className="w-full md:w-64 shrink-0 space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-border p-6 sticky top-24">
              <h3 className="font-semibold text-lg text-oz-primary mb-4">Categories</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setCategory(undefined); setPage(1); }}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !category ? 'bg-oz-primary text-white font-medium' : 'hover:bg-muted text-muted-foreground hover:text-oz-primary'
                  }`}
                >
                  All Posts
                </button>
                {commonCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setPage(1); }}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === cat ? 'bg-oz-primary text-white font-medium' : 'hover:bg-muted text-muted-foreground hover:text-oz-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Blog Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <Skeleton className="w-full aspect-[4/3] rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ))}
              </div>
            ) : blogs.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-border py-24 text-center">
                <h3 className="text-xl font-semibold text-oz-primary mb-2">No posts found</h3>
                <p className="text-muted-foreground mb-6">There are no blog posts matching your criteria right now.</p>
                {category && (
                  <Button variant="outline" onClick={() => setCategory(undefined)}>
                    Clear category filter
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                  {blogs.map((blog, idx) => (
                    <motion.div
                      key={blog.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.1, 0.4) }}
                      className="group flex flex-col cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all"
                      onClick={() => navigate(`/blogs/${blog.slug}`)}
                    >
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-muted border border-border">
                        {blog.coverImage?.url ? (
                          <img 
                            src={blog.coverImage.url} 
                            alt={blog.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-tr from-oz-primary/10 to-oz-accent/10" />
                        )}
                        {blog.category && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 text-oz-primary hover:bg-white border-0 shadow-sm backdrop-blur-sm">
                              {blog.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        {blog.authorName && (
                          <span className="flex items-center gap-1.5 font-medium">
                            <User className="w-3.5 h-3.5" />
                            {blog.authorName}
                          </span>
                        )}
                        {blog.publishedAt && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(blog.publishedAt)}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-oz-primary mb-2 leading-tight group-hover:text-oz-accent transition-colors line-clamp-2">
                        {blog.title}
                      </h3>
                      
                      {blog.excerpt && (
                        <p className="text-black text-sm line-clamp-3 mb-4 flex-1">
                          {blog.excerpt}
                        </p>
                      )}

                      <div className="mt-auto pt-2 flex items-center text-sm font-semibold text-oz-accent">
                        Read Article <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-16 flex items-center justify-between border-t border-border pt-8">
                  <Button 
                    variant="outline" 
                    disabled={page <= 1} 
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous Page
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">Page {page}</span>
                  <Button 
                    variant="outline" 
                    disabled={!hasNextPage.current} 
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next Page
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
