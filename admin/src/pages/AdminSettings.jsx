import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import OneLoader from '@/components/ui/OneLoader';
import SEO from '@/components/seo/SEO';
import { CURRENCY_OPTIONS } from '@/utils/currency';
import {
  fetchSettings,
  selectCurrency,
  selectSettingsStatus,
  selectSettingsUpdateStatus,
  updateSettings,
} from '@/redux/slices/settings/settingsSlice';

const AdminSettings = () => {
  const dispatch = useDispatch();
  const currency = useSelector(selectCurrency);
  const status = useSelector(selectSettingsStatus);
  const updateStatus = useSelector(selectSettingsUpdateStatus);

  const [selectedCurrency, setSelectedCurrency] = useState('none');

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    setSelectedCurrency(currency || 'none');
  }, [currency]);

  const isDirty = selectedCurrency !== (currency || 'none');
  const isSaving = updateStatus === 'loading';

  const handleSave = async () => {
    try {
      await dispatch(updateSettings({ currency: selectedCurrency })).unwrap();
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to update settings');
    }
  };

  return (
    <>
      <SEO
        title="Admin Settings"
        description="Site-wide configuration for the storefront and admin dashboard."
        noIndex
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Site-wide configuration applied across the storefront and admin panel.</p>
        </div>

        <div className="max-w-xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Currency</h2>
            <p className="text-sm text-slate-500">
              Choose which currency symbol is shown on prices across the storefront and admin panel.
              This only changes how prices are displayed — it does not convert stored amounts.
            </p>
          </div>

          {status === 'loading' && !currency ? (
            <div className="py-6">
              <OneLoader size="small" text="Loading settings…" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={selectedCurrency}
                  onChange={(event) => setSelectedCurrency(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={!isDirty || isSaving} className="flex items-center gap-2">
                  {isSaving && <OneLoader size="tiny" inline />}
                  Save changes
                </Button>
                {isDirty && (
                  <Button type="button" variant="outline" onClick={() => setSelectedCurrency(currency || 'none')}>
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminSettings;
