import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { ADMIN_FORM_CONTAINER } from '@/components/admin';
import { adminBlogService, type Blog } from '@/services/adminBlogService';

const emptyDraft = (): Partial<Blog> => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  authorName: '',
  authorImage: '',
  category: '',
  tags: [],
  status: 'draft',
  featured: false,
});

export default function AdminBlogForm() {
  const { id } = useParams();
  const isEditing = Boolean(id && id !== 'create');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [blog, setBlog] = useState<Partial<Blog>>(emptyDraft());
  const [tagsString, setTagsString] = useState('');

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPct, setCoverPct] = useState<number | undefined>(undefined);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPct, setBannerPct] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isEditing || !id) return;
    adminBlogService.get(id).then((res) => {
      setBlog(res.data);
      setTagsString(res.data.tags?.join(', ') || '');
      setLoading(false);
    }).catch(() => {
      toast({ title: 'Error', description: 'Failed to load blog.', variant: 'destructive' });
      navigate('/admin/blogs');
    });
  }, [id, isEditing, navigate, toast]);

  const handleSave = async (publishNow = false) => {
    if (!blog.title) {
      toast({ title: 'Validation Error', description: 'Title is required.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...blog,
        tags: tagsString.split(',').map((t) => t.trim()).filter(Boolean),
        status: (publishNow || blog.status === 'published') ? 'published' as const : 'draft' as const,
      };

      let savedBlog: Blog;
      if (isEditing && id) {
        const res = await adminBlogService.update(id, payload);
        savedBlog = res.data;
        toast({ title: 'Blog Updated', description: 'Changes have been saved successfully.' });
      } else {
        const res = await adminBlogService.create(payload);
        savedBlog = res.data;
        toast({ title: 'Blog Created', description: 'New blog post has been created.' });
      }

      // Handle image uploads sequentially if present
      if (coverFile) {
        await adminBlogService.uploadCover(savedBlog.id, coverFile, {
          onProgress: setCoverPct,
        });
        setCoverFile(null);
      }

      if (bannerFile) {
        await adminBlogService.uploadBanner(savedBlog.id, bannerFile, {
          onProgress: setBannerPct,
        });
        setBannerFile(null);
      }

      if (!isEditing) {
        navigate('/admin/blogs');
      } else {
        // Refresh local state without full reload
        const fresh = await adminBlogService.get(savedBlog.id);
        setBlog(fresh.data);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Error saving blog.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading blog data...</div>;
  }

  return (
    <div className="space-y-6 lg:pb-24">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2 shrink-0" onClick={() => navigate('/admin/blogs')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Blogs
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            Save {blog.status === 'draft' && 'Draft'}
          </Button>
          {(blog.status !== 'published') && (
            <Button onClick={() => handleSave(true)} disabled={saving}>
              <Send className="w-4 h-4 mr-2" />
              Publish Now
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={ADMIN_FORM_CONTAINER}>
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-oz-primary">Blog Content</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Post Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Best High Protein Meals..."
                  value={blog.title}
                  onChange={(e) => setBlog({ ...blog, title: e.target.value })}
                />
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="slug">Custom URL Slug (optional)</Label>
                  <Input
                    id="slug"
                    placeholder="Auto-generated from title if left blank"
                    value={blog.slug}
                    onChange={(e) => setBlog({ ...blog, slug: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">The generated slug will be: /blogs/{blog.slug}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="excerpt">Short Excerpt</Label>
                <Textarea
                  id="excerpt"
                  placeholder="A clear 1-2 sentence summary of the blog post..."
                  rows={2}
                  value={blog.excerpt}
                  onChange={(e) => setBlog({ ...blog, excerpt: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Full HTML Post Content</Label>
                <Textarea
                  id="content"
                  placeholder="<p>Write your html blog content here...</p>"
                  rows={20}
                  className="font-mono text-sm leading-relaxed"
                  value={blog.content}
                  onChange={(e) => setBlog({ ...blog, content: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Wrap paragraphs in &lt;p&gt; tags. Use &lt;h2&gt; and &lt;h3&gt; for subheadings.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={ADMIN_FORM_CONTAINER}>
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-oz-primary">Images</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2 pb-4 border-b border-border">
                <Label>Cover Image (Square/Thumbnail)</Label>
                <ImageDropzone
                  onChange={(b) => setCoverFile(b)}
                  value={coverFile}
                  progressPct={coverPct}
                />
              </div>
              <div className="space-y-2">
                <Label>Banner Image (Wide/Hero)</Label>
                <ImageDropzone
                  onChange={(b) => setBannerFile(b)}
                  value={bannerFile}
                  progressPct={bannerPct}
                />
              </div>
            </div>
          </div>

          <div className={ADMIN_FORM_CONTAINER}>
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-oz-primary">Metadata</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g. Nutrition"
                  value={blog.category}
                  onChange={(e) => setBlog({ ...blog, category: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="e.g. weight loss, protein, prep"
                  value={tagsString}
                  onChange={(e) => setTagsString(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Comma separated values</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authorName">Author Name</Label>
                <Input
                  id="authorName"
                  placeholder="OG Gainz Team"
                  value={blog.authorName}
                  onChange={(e) => setBlog({ ...blog, authorName: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="featured" className="cursor-pointer">Feature on Blog Page</Label>
                <Switch
                  id="featured"
                  checked={blog.featured}
                  onCheckedChange={(c) => setBlog({ ...blog, featured: c })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
