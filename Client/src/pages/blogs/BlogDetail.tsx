import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Share2, User } from 'lucide-react';
import { blogService } from '@/services/blogService';
import type { Blog } from '@/services/adminBlogService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/dateUtils';

export default function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Blog[]>([]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    blogService.getBySlug(slug)
      .then((res) => {
        setBlog(res.data);
        document.title = `${res.data.title} | OG Gainz Blog`;
        
        // Fetch related blogs after getting the main blog
        blogService.getRelated(slug)
          .then((relRes) => setRelated(relRes.data))
          .catch(() => {}); // ignore related err
      })
      .catch(() => {
        toast({ title: 'Not Found', description: 'This blog post could not be found.', variant: 'destructive' });
        navigate('/blogs');
      })
      .finally(() => {
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }, [slug, navigate, toast]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: blog?.title,
          text: blog?.excerpt,
          url: url,
        });
      } catch (err) {
        // ignore share cancellation
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'The link has been copied to your clipboard.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-oz-neutral/5">
        <div className="container mx-auto max-w-4xl px-4 animate-pulse">
          <div className="h-8 w-32 bg-muted rounded mb-8"></div>
          <div className="h-64 md:h-96 w-full bg-muted rounded-2xl mb-12"></div>
          <div className="h-10 w-3/4 bg-muted rounded mb-6"></div>
          <div className="h-6 w-full bg-muted rounded mb-4"></div>
          <div className="h-6 w-5/6 bg-muted rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return null; // Handled in useEffect catch
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Banner Hero */}
      <div className="relative w-full aspect-[21/9] md:aspect-[21/8] lg:max-h-[600px] bg-oz-primary overflow-hidden">
          {blog.bannerImage?.url ? (
            <img src={blog.bannerImage.url} alt={blog.title} className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-oz-primary to-oz-accent opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          
          <div className="absolute top-4 left-4 md:top-8 md:left-8 z-10">
            <Button variant="ghost" size="sm" onClick={() => navigate('/blogs')} className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Posts
            </Button>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 lg:p-20 container mx-auto flex justify-center">
            <div className="max-w-4xl w-full">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {blog.category && (
                  <span className="px-3 py-1.5 bg-oz-accent text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-sm">
                    {blog.category}
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight drop-shadow-md">
                {blog.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-white/90 font-medium text-sm md:text-base">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md overflow-hidden border-2 border-white/50 flex items-center justify-center text-white font-bold text-xl">
                    {blog.authorName ? blog.authorName.charAt(0).toUpperCase() : 'O'}
                  </div>
                  <div>
                    <p className="text-white font-bold text-base leading-none">{blog.authorName || 'OG Gainz Team'}</p>
                    {blog.publishedAt && (
                      <span className="text-white/70 text-sm mt-1 block">
                        {formatDate(blog.publishedAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-10 w-px bg-white/30 hidden sm:block"></div>

                {blog.readingTime ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {blog.readingTime} min read
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Article Body */}
        <article className="container mx-auto px-4 md:px-6 py-12 lg:py-20 flex justify-center">
          <div className="max-w-3xl w-full">
            
            {blog.excerpt && (
              <div className="text-xl md:text-2xl text-black font-medium italic border-l-4 border-oz-accent pl-6 mb-12 leading-relaxed">
                {blog.excerpt}
              </div>
            )}

            {/* Generated HTML content */}
            <div 
              className="prose prose-lg md:prose-xl max-w-none text-black prose-headings:text-black prose-a:text-oz-accent hover:prose-a:text-oz-primary prose-img:rounded-2xl prose-img:shadow-md prose-img:my-10"
              dangerouslySetInnerHTML={{ __html: blog.content || '<p></p>' }}
            />

            {/* Footer / Tags */}
            <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-2">
                {blog.tags && blog.tags.length > 0 && (
                  <>
                    <span className="text-sm font-semibold text-muted-foreground mr-2">Tags:</span>
                    {blog.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-oz-primary">
                        #{tag}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
              <Button variant="outline" className="shrink-0 rounded-full hover:text-white" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share Post
              </Button>
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {related.length > 0 && (
          <div className="bg-oz-neutral/5 py-16 md:py-24 border-t border-border">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-5xl mx-auto">
                <h3 className="text-3xl font-bold text-oz-primary mb-10">Read More</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {related.map((rel) => (
                    <div 
                      key={rel.id} 
                      className="group cursor-pointer flex flex-col"
                      onClick={() => navigate(`/blogs/${rel.slug}`)}
                    >
                      <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-muted border border-border relative">
                        {rel.coverImage?.url ? (
                          <img 
                            src={rel.coverImage.url} 
                            alt={rel.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-tr from-oz-primary/10 to-oz-accent/10" />
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-oz-primary mb-2 line-clamp-2 group-hover:text-oz-accent transition-colors">
                        {rel.title}
                      </h4>
                      {rel.publishedAt && (
                        <p className="text-sm text-muted-foreground font-medium">
                          {formatDate(rel.publishedAt)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
