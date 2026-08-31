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
  updateSettings,
  uploadLogo,
  deleteLogo,
} from '@/redux/slices/settings/settingsSlice';

// One row of a footer link list (Furniture / Customer care columns).
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
    footerCustomerCareLinks: footerCustomerCareLinks || [],
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
    footerCustomerCareLinks,
  ]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(buildFormFromStore());
  const isSaving = updateStatus === 'loading';

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
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
      await dispatch(uploadLogo(file)).unwrap();
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
