import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Filter,
  ImagePlus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Pencil,
  Eye,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { adminBlogService, type Blog } from '@/services/adminBlogService';
import { formatDate } from '@/utils/dateUtils';

type StatusFilter = 'all' | 'published' | 'draft';
type FeaturedFilter = 'all' | 'featured' | 'not_featured';

export default function AdminBlogs() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Blog[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>('all');

  const hasNextPage = useRef(true);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminBlogService.list({
        page,
        limit: 20,
        q: query.trim() ? query.trim() : undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        featured:
          featuredFilter === 'all'
            ? undefined
            : featuredFilter === 'featured'
              ? true
              : false
      });
      setItems(res.data);
      hasNextPage.current = Boolean(res.meta?.hasNextPage);
    } catch (e) {
      hasNextPage.current = false;
      setItems([]);
      setError('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  }, [page, query, statusFilter, featuredFilter]);

  useEffect(() => {
    void fetchBlogs();
  }, [fetchBlogs]);

  const handleTogglePublish = async (blog: Blog) => {
    try {
      const res = await adminBlogService.togglePublish(blog.id);
      setItems((prev) => prev.map((m) => (m.id === blog.id ? { ...m, ...res.data } : m)));
      toast({ title: 'Status updated', description: res.data.title });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
  };

  const handleToggleFeatured = async (blog: Blog) => {
    try {
      const res = await adminBlogService.toggleFeatured(blog.id);
      setItems((prev) => prev.map((m) => (m.id === blog.id ? { ...m, ...res.data } : m)));
      toast({ title: res.data.featured ? 'Featured added' : 'Featured removed', description: res.data.title });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to feature blog.', variant: 'destructive' });
    }
  };

  const handleDelete = async (blog: Blog) => {
    try {
      await adminBlogService.remove(blog.id);
      toast({ title: 'Blog deleted', description: blog.title });
      await fetchBlogs();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete blog.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchBlogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/admin/blogs/create')}>
            <Plus className="w-4 h-4 mr-2" />
            New Blog Post
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search blogs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={featuredFilter} onValueChange={(v) => setFeaturedFilter(v as FeaturedFilter)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Featured" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blogs</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="not_featured">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">All Blog Posts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">{error}</p>
              <p className="text-sm">Try refreshing.</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-medium">No blog posts found</p>
              <p className="text-sm">Create a blog to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((blog, index) => (
                <motion.div
                  key={blog.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.03, 0.35) }}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-20 h-14 rounded-md overflow-hidden bg-muted shrink-0 border">
                        {blog.coverImage?.url ? (
                          <img 
                            src={blog.coverImage.url} 
                            alt={blog.title} 
                            className="w-full h-full object-cover" 
                            loading="lazy" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImagePlus className="w-6 h-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-semibold text-base truncate">{blog.title}</p>
                          {blog.status === 'published' ? (
                            <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Published</Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                          {blog.featured && (
                            <Badge variant="outline" className="border-amber-500 text-amber-600">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Featured
                            </Badge>
                          )}
                          {blog.category && <Badge variant="outline">{blog.category}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{blog.excerpt || 'No excerpt provided...'}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
                          {blog.authorName && <span>By {blog.authorName}</span>}
                          {blog.publishedAt && <span>• Published on {formatDate(blog.publishedAt)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end shrink-0">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground w-16 text-right">Publish</span>
                          <Switch
                            checked={blog.status === 'published'}
                            onCheckedChange={() => handleTogglePublish(blog)}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground w-16 text-right">Feature</span>
                          <Switch
                            checked={blog.featured}
                            onCheckedChange={() => handleToggleFeatured(blog)}
                          />
                        </div>
                      </div>

                      <div className="h-10 w-px bg-border mx-1 hidden lg:block"></div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/blogs/${blog.id}`)}>
                          <Eye className="w-4 h-4 lg:mr-2" />
                          <span className="hidden lg:inline">View</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/blogs/${blog.id}/edit`)}>
                          <Pencil className="w-4 h-4 lg:mr-2" />
                          <span className="hidden lg:inline">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 lg:mr-2" />
                              <span className="hidden lg:inline">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Blog Post?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete "{blog.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(blog)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </Button>
        <div className="text-xs text-muted-foreground">Page {page}</div>
        <Button
          variant="outline"
          disabled={loading || !hasNextPage.current}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
