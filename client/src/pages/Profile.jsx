import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateProfile } from '@/redux/slices/auth/authSlice';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OneLoader from '@/components/ui/OneLoader';
import AddressManager from '@/components/custom/AddressManager';
import SEO from '@/components/seo/SEO';
import { Mail, Phone, MapPin, Home, User, Pencil, Plus } from 'lucide-react';

const StatTile = ({ icon: Icon, label, value, onAdd }) => {
  const isEmpty = !value;
  return (
    <div
      role={isEmpty && onAdd ? 'button' : undefined}
      tabIndex={isEmpty && onAdd ? 0 : undefined}
      onClick={isEmpty ? onAdd : undefined}
      className={`flex items-center gap-4 rounded-2xl border bg-white p-5 transition ${
        isEmpty
          ? 'cursor-pointer border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          : 'border-gray-200'
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</p>
        {isEmpty ? (
          <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-gray-400">
            <Plus className="h-3.5 w-3.5" /> Add {label.toLowerCase()}
          </p>
        ) : (
          <p className="mt-0.5 truncate text-base font-semibold text-gray-900">{value}</p>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, span }) => (
  <div className={`flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 ${span ? 'sm:col-span-2' : ''}`}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</p>
      <p className={`mt-0.5 text-sm font-medium ${value ? 'text-gray-900' : 'text-gray-400'}`}>
        {value || 'Not provided'}
      </p>
    </div>
  </div>
);

const Profile = () => {
  const dispatch = useDispatch();
  const { user, status } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    address: user?.address || '',
    phone: user?.phone || '',
    city: user?.city || ''
  });

  const [showForm, setShowForm] = useState(!user?.address || !user?.phone || !user?.city);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    setFormData({
      address: user?.address || '',
      phone: user?.phone || '',
      city: user?.city || ''
    });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    dispatch(updateProfile(formData))
      .unwrap()
      .then(() => {
        toast.success('Profile updated successfully');
        setShowForm(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error(err || 'Update failed');
      });
  };

  const openEditFor = () => {
    setActiveTab('profile');
    setShowForm(true);
  };

  const seoElement = (
    <SEO
      title={user?.name ? `${user.name} Account` : 'Account Profile'}
      description="Manage your saved addresses, phone number, and profile preferences for faster checkout."
      keywords={['account profile', 'Ecommerce account settings']}
      noIndex
    />
  );

  if (!user) {
    return (
      <>
        {seoElement}
        <div className="mx-auto max-w-5xl space-y-6 p-4 pt-24 pb-12">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  return (
    <>
      {seoElement}
      <div className="min-h-screen bg-gray-50 px-4 pt-20 pb-16 sm:pt-24">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Hero */}
          <section className="overflow-hidden rounded-2xl bg-black shadow-sm">
            <div className="flex flex-col gap-6 px-6 py-8 sm:px-10 sm:py-10 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <Avatar className="h-20 w-20 border-2 border-white/15 sm:h-24 sm:w-24">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-white/10 text-2xl font-semibold text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Profile</p>
                  <h1 className="mt-1 truncate text-2xl font-bold text-white sm:text-3xl">{user?.name}</h1>
                  <p className="mt-0.5 truncate text-sm text-white/60">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-4 py-2 md:self-auto">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">Active account</span>
              </div>
            </div>
          </section>

          {/* Quick stats */}
          <section className="grid gap-4 sm:grid-cols-3">
            <StatTile icon={Phone} label="Phone" value={user?.phone} onAdd={openEditFor} />
            <StatTile icon={MapPin} label="City" value={user?.city?.slice(0, 20)?.toUpperCase()} onAdd={openEditFor} />
            <StatTile icon={Home} label="Address" value={user?.address?.slice(0, 56)} onAdd={openEditFor} />
          </section>

          {/* Settings */}
          <Card className="rounded-2xl border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Settings</p>
                <CardTitle className="mt-1 text-xl font-bold text-gray-900">Account Details</CardTitle>
              </div>
              {activeTab === 'profile' && !showForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(true)}
                  className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid h-11 w-full grid-cols-2 rounded-full bg-gray-100 p-1">
                  <TabsTrigger
                    value="profile"
                    className="gap-2 rounded-full text-sm font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    <User className="h-4 w-4" /> Profile Info
                  </TabsTrigger>
                  <TabsTrigger
                    value="addresses"
                    className="gap-2 rounded-full text-sm font-medium text-gray-600 data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    <MapPin className="h-4 w-4" /> Addresses
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="pt-8">
                  {!showForm ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow icon={Mail} label="Email" value={user?.email} />
                      <InfoRow icon={Phone} label="Phone" value={user?.phone} />
                      <InfoRow icon={MapPin} label="City" value={user?.city?.slice(0, 20)?.toUpperCase()} />
                      <InfoRow icon={Home} label="Address" value={user?.address} />
                    </div>
                  ) : (
                    <div className="space-y-6 rounded-2xl border border-gray-200 p-6">
                      <h2 className="text-lg font-bold text-gray-900">Update Profile Information</h2>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              placeholder="e.g. 0300 1234567"
                              value={formData.phone}
                              onChange={handleChange}
                              required
                              className="border-gray-300 bg-white pl-10 text-gray-900 focus-visible:ring-black"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="city" className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                            City
                          </label>
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              id="city"
                              name="city"
                              type="text"
                              placeholder="e.g. Lahore"
                              value={formData.city}
                              onChange={handleChange}
                              required
                              maxLength={20}
                              className="border-gray-300 bg-white pl-10 text-gray-900 focus-visible:ring-black"
                            />
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label htmlFor="address" className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                            Address
                          </label>
                          <Textarea
                            id="address"
                            name="address"
                            placeholder="House / street / area"
                            value={formData.address}
                            onChange={handleChange}
                            required
                            rows={4}
                            className="border-gray-300 bg-white text-gray-900 focus-visible:ring-black"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="addresses" className="pt-8">
                  <AddressManager />
                </TabsContent>
              </Tabs>
            </CardContent>

            {activeTab === 'profile' && showForm && (
              <CardFooter className="flex flex-col gap-3 border-t border-gray-100 py-6 sm:flex-row sm:justify-end">
                <Button
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  disabled={status === 'loading'}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={status === 'loading'}
                  className="flex items-center gap-2 bg-black text-white hover:bg-black/90"
                >
                  {status === 'loading' ? (
                    <OneLoader size="small" text="Saving..." showText={false} />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default Profile;
