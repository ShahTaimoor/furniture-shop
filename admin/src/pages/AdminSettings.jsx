import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Plus, Trash, Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import OneLoader from '@/components/ui/OneLoader';
import SEO from '@/components/seo/SEO';
import { CURRENCY_OPTIONS } from '@/utils/currency';
import { convertToWebP } from '@/utils/imageConverter';
import {
  fetchSettings,
  selectCurrency,
  selectSettingsStatus,
  selectSettingsUpdateStatus,
  selectSiteName,
  selectSiteLogo,
  selectFooterDescription,
  selectFooterHours,
  selectFooterShowroomAddress,
  selectFooterCarePhone,
  selectFooterStudioEmail,
  selectFooterCustomerCareLinks,
  selectStandardShippingCost,
  selectExpressShippingCost,
  selectFreeShippingThreshold,
  selectHomeTrustBadges,
  selectHomeReviews,
  selectNewsletterHeading,
  selectNewsletterSubtext,
  selectFooterFacebookUrl,
  selectFooterWhatsappUrl,
  selectFooterPinterestUrl,
  selectFooterLinkedinUrl,
  selectFooterInstagramUrl,
  selectFooterYoutubeUrl,
  updateSettings,
  uploadLogo,
  deleteLogo,
} from '@/redux/slices/settings/settingsSlice';

const TRUST_ICON_OPTIONS = [
  { value: 'shield', label: 'Shield' },
  { value: 'truck', label: 'Truck' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'badge', label: 'Badge' },
  { value: 'spark', label: 'Sparkle' },
];

// One row of a footer link list (Company / Customer care column).
const LinkListEditor = ({ label, hint, links, onChange }) => {
  const updateRow = (index, field, value) => {
    const next = links.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    onChange(next);
  };
  const addRow = () => onChange([...links, { label: '', url: '' }]);
  const removeRow = (index) => onChange(links.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <div className="space-y-2">
        {links.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="Label"
              value={row.label}
              onChange={(e) => updateRow(index, 'label', e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="URL (optional)"
              value={row.url}
              onChange={(e) => updateRow(index, 'url', e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-red-600 hover:text-red-700" onClick={() => removeRow(index)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-2">
        <Plus className="h-3.5 w-3.5" />
        Add link
      </Button>
    </div>
  );
};

const AdminSettings = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const currency = useSelector(selectCurrency);
  const siteName = useSelector(selectSiteName);
  const siteLogo = useSelector(selectSiteLogo);
  const footerDescription = useSelector(selectFooterDescription);
  const footerHours = useSelector(selectFooterHours);
  const footerShowroomAddress = useSelector(selectFooterShowroomAddress);
  const footerCarePhone = useSelector(selectFooterCarePhone);
  const footerStudioEmail = useSelector(selectFooterStudioEmail);
  const footerCustomerCareLinks = useSelector(selectFooterCustomerCareLinks);
  const standardShippingCost = useSelector(selectStandardShippingCost);
  const expressShippingCost = useSelector(selectExpressShippingCost);
  const freeShippingThreshold = useSelector(selectFreeShippingThreshold);
  const homeTrustBadges = useSelector(selectHomeTrustBadges);
  const homeReviews = useSelector(selectHomeReviews);
  const newsletterHeading = useSelector(selectNewsletterHeading);
  const newsletterSubtext = useSelector(selectNewsletterSubtext);
  const footerFacebookUrl = useSelector(selectFooterFacebookUrl);
  const footerWhatsappUrl = useSelector(selectFooterWhatsappUrl);
  const footerPinterestUrl = useSelector(selectFooterPinterestUrl);
  const footerLinkedinUrl = useSelector(selectFooterLinkedinUrl);
  const footerInstagramUrl = useSelector(selectFooterInstagramUrl);
  const footerYoutubeUrl = useSelector(selectFooterYoutubeUrl);
  const status = useSelector(selectSettingsStatus);
  const updateStatus = useSelector(selectSettingsUpdateStatus);

  const buildFormFromStore = () => ({
    currency: currency || 'none',
    siteName: siteName || '',
    footerDescription: footerDescription || '',
    footerHours: footerHours || '',
    footerShowroomAddress: footerShowroomAddress || '',
    footerCarePhone: footerCarePhone || '',
    footerStudioEmail: footerStudioEmail || '',
    standardShippingCost: standardShippingCost ?? 0,
    expressShippingCost: expressShippingCost ?? 500,
    freeShippingThreshold: freeShippingThreshold ?? 150,
    footerCustomerCareLinks: footerCustomerCareLinks || [],
    newsletterHeading: newsletterHeading || '',
    newsletterSubtext: newsletterSubtext || '',
    homeTrustBadges: homeTrustBadges || [],
    homeReviews: homeReviews || [],
    footerFacebookUrl: footerFacebookUrl || '',
    footerWhatsappUrl: footerWhatsappUrl || '',
    footerPinterestUrl: footerPinterestUrl || '',
    footerLinkedinUrl: footerLinkedinUrl || '',
    footerInstagramUrl: footerInstagramUrl || '',
    footerYoutubeUrl: footerYoutubeUrl || '',
  });

  const [form, setForm] = useState(buildFormFromStore);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    setForm(buildFormFromStore());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currency, siteName, footerDescription, footerHours,
    footerShowroomAddress, footerCarePhone, footerStudioEmail,
    standardShippingCost, expressShippingCost, freeShippingThreshold,
    footerCustomerCareLinks,
    newsletterHeading, newsletterSubtext, homeTrustBadges, homeReviews,
    footerFacebookUrl, footerWhatsappUrl, footerPinterestUrl,
    footerLinkedinUrl, footerInstagramUrl, footerYoutubeUrl,
  ]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(buildFormFromStore());
  const isSaving = updateStatus === 'loading';

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const numericFields = ['standardShippingCost', 'expressShippingCost', 'freeShippingThreshold'];
    for (const key of numericFields) {
      if (form[key] === '' || Number.isNaN(Number(form[key])) || Number(form[key]) < 0) {
        toast.error('Shipping amounts must be non-negative numbers.');
        return;
      }
    }
    try {
      await dispatch(updateSettings(form)).unwrap();
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to update settings');
    }
  };

  const handleLogoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      // Sent uncompressed before — a raw logo photo/export could exceed the hosting
      // platform's request size limit and fail with a 413 (and a confusing CORS error,
      // since the proxy rejects the oversized body before Express ever runs).
      let processedFile = file;
      if (file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        try {
          processedFile = await convertToWebP(file, {
            quality: 0.85,
            maxWidth: 800,
            maxHeight: 800,
            maintainAspectRatio: true,
          });
        } catch (conversionError) {
          console.error('Logo conversion error:', conversionError);
        }
      }

      await dispatch(uploadLogo(processedFile)).unwrap();
      toast.success('Logo updated successfully');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await dispatch(deleteLogo()).unwrap();
      toast.success('Logo removed');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to remove logo');
    }
  };

  if (status === 'loading' && !siteName) {
    return (
      <div className="py-16">
        <OneLoader size="small" text="Loading settings…" />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Admin Settings"
        description="Site-wide configuration for the storefront and admin dashboard."
        noIndex
      />
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Site-wide configuration applied across the storefront and admin panel.</p>
        </div>

        {/* Currency */}
        <div className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Currency</h2>
            <p className="text-sm text-slate-500">
              Choose which currency symbol is shown on prices across the storefront and admin panel.
              This only changes how prices are displayed — it does not convert stored amounts.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              value={form.currency}
              onChange={(e) => setField('currency', e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Branding */}
        <div className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
            <p className="text-sm text-slate-500">Site name and logo, shown in the navbar and footer.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteName">Site name</Label>
            <Input id="siteName" value={form.siteName} onChange={(e) => setField('siteName', e.target.value)} placeholder="Ecommerce" />
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {siteLogo?.secure_url ? (
                  <img src={siteLogo.secure_url} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFile}
                />
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploadingLogo}>
                  {isUploadingLogo ? <OneLoader size="tiny" inline /> : <Upload className="h-3.5 w-3.5" />}
                  {siteLogo?.secure_url ? 'Replace logo' : 'Upload logo'}
                </Button>
                {siteLogo?.secure_url && (
                  <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={handleRemoveLogo}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500">If no logo is uploaded, the default bundled logo is used.</p>
          </div>
        </div>

        {/* Footer content */}
        <div className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Footer content</h2>
            <p className="text-sm text-slate-500">The tagline and hours shown under the logo in the footer.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerDescription">Description</Label>
            <Textarea id="footerDescription" rows={3} value={form.footerDescription} onChange={(e) => setField('footerDescription', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerHours">Hours</Label>
            <Input id="footerHours" value={form.footerHours} onChange={(e) => setField('footerHours', e.target.value)} placeholder="Open daily 10am – 8pm" />
          </div>
        </div>

        {/* Contact */}
        <div className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
            <p className="text-sm text-slate-500">Shown in the footer's Contact column.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerShowroomAddress">Showroom address</Label>
            <Input id="footerShowroomAddress" value={form.footerShowroomAddress} onChange={(e) => setField('footerShowroomAddress', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerCarePhone">Customer care phone</Label>
            <Input id="footerCarePhone" value={form.footerCarePhone} onChange={(e) => setField('footerCarePhone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerStudioEmail">Studio email</Label>
            <Input id="footerStudioEmail" value={form.footerStudioEmail} onChange={(e) => setField('footerStudioEmail', e.target.value)} />
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-800">Social links</p>
            <p className="text-xs text-slate-500">Full URLs. Leave blank to hide that icon in the footer.</p>
            {[
              ['footerFacebookUrl', 'Facebook URL'],
              ['footerWhatsappUrl', 'WhatsApp link (wa.me/… or https://)'],
              ['footerPinterestUrl', 'Pinterest URL'],
              ['footerLinkedinUrl', 'LinkedIn URL'],
              ['footerInstagramUrl', 'Instagram URL'],
              ['footerYoutubeUrl', 'YouTube URL'],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder="https://…"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Shipping */}
        <div className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Shipping</h2>
            <p className="text-sm text-slate-500">Delivery costs shown and charged at checkout.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="standardShippingCost">Standard delivery cost (3-5 days)</Label>
            <Input
              id="standardShippingCost"
              type="number"
              min={0}
              step="0.01"
              value={form.standardShippingCost}
              onChange={(e) => setField('standardShippingCost', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expressShippingCost">Express delivery cost (1-2 days)</Label>
            <Input
              id="expressShippingCost"
              type="number"
              min={0}
              step="0.01"
              value={form.expressShippingCost}
              onChange={(e) => setField('expressShippingCost', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="freeShippingThreshold">Free standard-shipping threshold</Label>
            <Input
              id="freeShippingThreshold"
              type="number"
              min={0}
              step="0.01"
              value={form.freeShippingThreshold}
              onChange={(e) => setField('freeShippingThreshold', e.target.value === '' ? '' : Number(e.target.value))}
            />
            <p className="text-xs text-slate-500">Orders at or above this amount get free standard delivery. Express delivery is always charged.</p>
          </div>
        </div>

        {/* Footer links */}
        <div className="max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Footer links</h2>
            <p className="text-sm text-slate-500">The link column in the footer.</p>
          </div>
          <LinkListEditor
            label="Customer care column"
            links={form.footerCustomerCareLinks}
            onChange={(next) => setField('footerCustomerCareLinks', next)}
          />
        </div>

        {/* Home page */}
        <div className="max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Home page</h2>
            <p className="text-sm text-slate-500">
              Content for the storefront home page: assurance strip, customer reviews and the newsletter band.
              (The "Featured collections" strip is managed under <strong>Banners → home_feature</strong>.)
            </p>
          </div>

          {/* Trust badges */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Assurance strip</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setField('homeTrustBadges', [
                    ...form.homeTrustBadges,
                    { icon: 'shield', title: '', subtitle: '' },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {form.homeTrustBadges.map((badge, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
                <select
                  value={badge.icon || 'shield'}
                  onChange={(e) =>
                    setField(
                      'homeTrustBadges',
                      form.homeTrustBadges.map((b, i) => (i === index ? { ...b, icon: e.target.value } : b))
                    )
                  }
                  className="rounded-md border border-slate-200 px-2 py-2 text-sm focus:border-black focus:outline-none"
                >
                  {TRUST_ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Input
                  className="flex-1 min-w-[120px]"
                  placeholder="Title"
                  value={badge.title || ''}
                  onChange={(e) =>
                    setField(
                      'homeTrustBadges',
                      form.homeTrustBadges.map((b, i) => (i === index ? { ...b, title: e.target.value } : b))
                    )
                  }
                />
                <Input
                  className="flex-1 min-w-[120px]"
                  placeholder="Subtitle"
                  value={badge.subtitle || ''}
                  onChange={(e) =>
                    setField(
                      'homeTrustBadges',
                      form.homeTrustBadges.map((b, i) => (i === index ? { ...b, subtitle: e.target.value } : b))
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setField('homeTrustBadges', form.homeTrustBadges.filter((_, i) => i !== index))}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Reviews */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Customer reviews</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setField('homeReviews', [
                    ...form.homeReviews,
                    { name: '', location: '', rating: 5, text: '' },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {form.homeReviews.map((review, index) => {
              const patch = (field, value) =>
                setField(
                  'homeReviews',
                  form.homeReviews.map((r, i) => (i === index ? { ...r, [field]: value } : r))
                );
              return (
                <div key={index} className="space-y-2 rounded-lg border border-slate-200 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input className="flex-1 min-w-[120px]" placeholder="Name" value={review.name || ''} onChange={(e) => patch('name', e.target.value)} />
                    <Input className="flex-1 min-w-[120px]" placeholder="Location" value={review.location || ''} onChange={(e) => patch('location', e.target.value)} />
                    <select
                      value={String(review.rating ?? 5)}
                      onChange={(e) => patch('rating', Number(e.target.value))}
                      className="rounded-md border border-slate-200 px-2 py-2 text-sm focus:border-black focus:outline-none"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{n} ★</option>
                      ))}
                    </select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setField('homeReviews', form.homeReviews.filter((_, i) => i !== index))}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea rows={2} placeholder="Review text" value={review.text || ''} onChange={(e) => patch('text', e.target.value)} />
                </div>
              );
            })}
          </div>

          {/* Newsletter band */}
          <div className="space-y-2">
            <Label htmlFor="newsletterHeading">Newsletter heading</Label>
            <Input id="newsletterHeading" value={form.newsletterHeading} onChange={(e) => setField('newsletterHeading', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newsletterSubtext">Newsletter subtext</Label>
            <Textarea id="newsletterSubtext" rows={2} value={form.newsletterSubtext} onChange={(e) => setField('newsletterSubtext', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-3">
          <Button onClick={handleSave} disabled={!isDirty || isSaving} className="flex items-center gap-2">
            {isSaving && <OneLoader size="tiny" inline />}
            Save changes
          </Button>
          {isDirty && (
            <Button type="button" variant="outline" onClick={() => setForm(buildFormFromStore())}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminSettings;
