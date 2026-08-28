import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  selectBanners,
  selectBannersStatus,
  updateBanner
} from '@/redux/slices/banners/bannersSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OneLoader from '@/components/ui/OneLoader';
import { toast } from 'sonner';
import { ImageIcon, Pencil, Trash2, LinkIcon, ArrowLeftCircle } from 'lucide-react';
import SEO from '@/components/seo/SEO';

const HERO_PLACEMENTS = ['hero_0', 'hero_1', 'hero_2', 'hero_3', 'hero_4', 'hero_5'];

const PLACEMENTS = HERO_PLACEMENTS.map((value) => ({
  value,
  label: `Hero Slot [${value.split('_')[1] ?? '?'}]`
}));

const initialFormState = {
  title: '',
  subtitle: '',
  redirectLink: '',
  placement: PLACEMENTS[0]?.value ?? 'hero_0',
  status: 'active',
  displayOrder: 0
};

const AdminBanners = () => {
  const dispatch = useDispatch();
  const banners = useSelector(selectBanners);
  const status = useSelector(selectBannersStatus);

  const [formState, setFormState] = useState(initialFormState);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    dispatch(fetchBanners());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const activeCount = useMemo(
    () => banners.filter((banner) => banner.status === 'active').length,
    [banners]
  );

  const inactiveCount = useMemo(
    () => banners.filter((banner) => banner.status === 'inactive').length,
    [banners]
  );

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: name === 'displayOrder' ? Number(value) : value
    }));
  };

  const handleStatusToggle = (event) => {
    const checked = event.target.checked;
    setFormState((prev) => ({
      ...prev,
      status: checked ? 'active' : 'inactive'
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setImageFile(file);
    setPreviewUrl(objectUrl);
  };

  const resetForm = () => {
    setFormState(initialFormState);
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setEditingId(null);
  };

  const handleEdit = (banner) => {
    setFormState({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      redirectLink: banner.redirectLink || '',
      placement: banner.placement || 'homepage_top',
      status: banner.status || 'active',
      displayOrder: banner.displayOrder ?? 0
    });
    setEditingId(banner._id);
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(banner.image?.secure_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formState.placement) {
      toast.error('Select a placement');
      return;
    }
    if (!editingId && !imageFile) {
      toast.error('Please upload a banner image');
      return;
    }

    const payload = new FormData();
    payload.append('title', formState.title ?? '');
    payload.append('subtitle', formState.subtitle);
    payload.append('redirectLink', formState.redirectLink);
    payload.append('placement', formState.placement);
    payload.append('status', formState.status);
    payload.append('displayOrder', formState.displayOrder ?? 0);
    if (imageFile) {
      payload.append('image', imageFile);
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await dispatch(updateBanner({ id: editingId, data: payload })).unwrap();
        toast.success('Banner updated successfully');
      } else {
        await dispatch(createBanner(payload)).unwrap();
        toast.success('Banner created successfully');
      }
      resetForm();
      dispatch(fetchBanners());
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to save banner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const confirmed = window.confirm('Are you sure you want to delete this banner?');
    if (!confirmed) return;
    try {
      await dispatch(deleteBanner(id)).unwrap();
      toast.success('Banner deleted');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to delete banner');
    }
  };

  const handleStatusChange = async (banner) => {
    try {
      await dispatch(
        updateBanner({
          id: banner._id,
          data: {
            status: banner.status === 'active' ? 'inactive' : 'active'
          }
        })
      ).unwrap();
      toast.success('Banner status updated');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to update status');
    }
  };

  return (
    <>
      <SEO
        title="Admin Banner Manager"
        description="Create, schedule, and optimise hero banners for upcoming Ecommerce campaigns in the admin dashboard."
        keywords={['admin banners', 'campaign management']}
        noIndex
      />
      <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Banner Management</h1>
          <p className="text-sm text-slate-600">
            Create, update, and schedule promotional banners across the storefront.
          </p>
        </div>
        {editingId && (
          <Button variant="ghost" onClick={resetForm} className="gap-2">
            <ArrowLeftCircle className="w-4 h-4" />
            Back to create new
          </Button>
        )}
      </div>

      <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <form
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? 'Update Banner' : 'Create New Banner'}
            </h2>
            <Badge variant={formState.status === 'active' ? 'default' : 'secondary'}>
              {formState.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formState.title}
                onChange={handleInputChange}
                placeholder="Optional headline"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle / Description</Label>
              <Textarea
                id="subtitle"
                name="subtitle"
                value={formState.subtitle}
                onChange={handleInputChange}
                placeholder="Up to 40% off on selected items."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirectLink">Redirect Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="redirectLink"
                  name="redirectLink"
                  value={formState.redirectLink}
                  onChange={handleInputChange}
                  placeholder="https://example.com/sale"
                />
                <LinkIcon className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500">
                Optional. Leave blank to keep the banner non-interactive.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="placement">Placement</Label>
                <select
                  id="placement"
                  name="placement"
                  value={formState.placement}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  {PLACEMENTS.map((placement) => (
                    <option key={placement.value} value={placement.value}>
                      {placement.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  name="displayOrder"
                  value={formState.displayOrder}
                  onChange={handleInputChange}
                  min={0}
                />
                <p className="text-xs text-slate-500">
                  Lower numbers appear first within the same placement.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusToggle" className="flex items-center gap-2">
                <input
                  id="statusToggle"
                  type="checkbox"
                  checked={formState.status === 'active'}
                  onChange={handleStatusToggle}
                  className="h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                />
                <span>Active</span>
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Banner Image</Label>
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4">
                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-sm"
                />
                <p className="text-xs text-slate-500">
                  Recommended ratio 16:9. Formats: JPG, PNG, or WebP. Max 8MB.
                </p>
                <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {previewUrl ? (
                    <button
                      type="button"
                      onClick={() => setImagePreview({ url: previewUrl, alt: formState.title || 'Banner preview' })}
                      className="h-full w-full cursor-zoom-in"
                    >
                      <img
                        src={previewUrl}
                        alt="Banner preview"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-xs">Upload an image to preview</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting} className="flex items-center gap-2">
              {submitting && <OneLoader size="tiny" inline />}
              {editingId ? 'Update Banner' : 'Create Banner'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </div>
        </form>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="bg-slate-100 text-slate-700">
              Total: {banners.length}
            </Badge>
            <Badge className="bg-black text-white">Active: {activeCount}</Badge>
            <Badge variant="secondary">Inactive: {inactiveCount}</Badge>
          </div>

          {status === 'loading' ? (
            <div className="flex h-full min-h-[240px] items-center justify-center">
              <OneLoader size="medium" text="Loading banners..." />
            </div>
          ) : banners.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <ImageIcon className="h-10 w-10 text-slate-300" />
              <div>
                <h3 className="text-lg font-semibold text-slate-800">No banners yet</h3>
                <p className="text-sm text-slate-500">Create a banner to promote upcoming campaigns.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners.map((banner) => (
                    <TableRow key={banner._id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() =>
                            banner.image?.secure_url &&
                            setImagePreview({ url: banner.image.secure_url, alt: banner.title || 'Banner image' })
                          }
                          className="h-20 w-36 cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                        >
                          <img
                            src={banner.image?.secure_url}
                            alt={banner.title}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{banner.title}</p>
                          {banner.subtitle && (
                            <p className="text-xs text-slate-500 line-clamp-2">{banner.subtitle}</p>
                          )}
                          {banner.redirectLink && (
                            <a
                              href={banner.redirectLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              Visit link
                              <LinkIcon className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm text-slate-700">
                          <span className="font-medium">
                            {PLACEMENTS.find((item) => item.value === banner.placement)?.label ||
                              banner.placement}
                          </span>
                          <span className="text-xs text-slate-500">Order: {banner.displayOrder ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={banner.status === 'active'}
                            onChange={() => handleStatusChange(banner)}
                            className="h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                          />
                          <span className="capitalize">{banner.status}</span>
                        </label>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(banner._id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
      </div>

      <Dialog open={!!imagePreview} onOpenChange={(open) => !open && setImagePreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{imagePreview?.alt || 'Image preview'}</DialogTitle>
          </DialogHeader>
          {imagePreview && (
            <img
              src={imagePreview.url}
              alt={imagePreview.alt}
              className="max-h-[70vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminBanners;


