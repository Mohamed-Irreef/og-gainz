import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, ExternalLink } from 'lucide-react';
import { adminBlogService, type Blog } from '@/services/adminBlogService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/dateUtils';

export default function AdminBlogView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminBlogService.get(id)
      .then((res) => {
        setBlog(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load blog preview.', variant: 'destructive' });
        navigate('/admin/blogs');
      });
  }, [id, navigate, toast]);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading blog preview...</div>;
  }

  if (!blog) {
    return <div className="p-12 text-center">Blog not found.</div>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/blogs')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-border hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <Badge variant={blog.status === 'published' ? 'default' : 'secondary'} className={blog.status === 'published' ? 'bg-emerald-500' : ''}>
              {blog.status.toUpperCase()}
            </Badge>
            {blog.featured && <Badge variant="outline" className="border-amber-500 text-amber-600">Featured</Badge>}
            <span className="text-sm font-medium text-muted-foreground ml-2">Preview Mode</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/blogs/${blog.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Blog
          </Button>
          <Button size="sm" variant="secondary" onClick={() => window.open(`/blogs/${blog.slug}`, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View Live
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-border max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="relative aspect-[21/9] bg-oz-primary w-full overflow-hidden">
          {blog.bannerImage?.url ? (
            <img src={blog.bannerImage.url} alt={blog.title} className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-oz-primary to-oz-accent opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 lg:p-14">
            <div className="flex items-center gap-3 mb-4">
              {blog.category && (
                <span className="px-3 py-1 bg-oz-accent text-white text-xs font-bold rounded-full uppercase tracking-wider">
                  {blog.category}
                </span>
              )}
              {blog.publishedAt && (
                <span className="text-white/80 text-sm font-medium">
                  {formatDate(blog.publishedAt)}
                </span>
              )}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight max-w-3xl">
              {blog.title}
            </h1>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-oz-primary font-bold">
                {blog.authorName ? blog.authorName.charAt(0).toUpperCase() : 'O'}
              </div>
              <div>
                <p className="text-white font-medium text-sm leading-none">{blog.authorName || 'OG Gainz Team'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-6 py-10 md:px-14 lg:px-20 max-w-4xl mx-auto">
          {blog.excerpt && (
            <div className="text-lg md:text-xl text-muted-foreground font-medium italic border-l-4 border-oz-accent pl-4 mb-10 leading-relaxed">
              {blog.excerpt}
            </div>
          )}

          <div 
            className="prose prose-lg md:prose-xl max-w-none text-oz-neutral prose-headings:text-oz-primary prose-a:text-oz-accent prose-img:rounded-xl prose-img:shadow-sm"
            dangerouslySetInnerHTML={{ __html: blog.content || '<p>No content provided yet.</p>' }}
          />

          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-14 pt-8 border-t border-border flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-2">Tags:</span>
              {blog.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="px-3 py-1 text-sm bg-muted/60 hover:bg-muted">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
