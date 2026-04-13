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

const InfoItem = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-xs uppercase tracking-[0.2em] text-black/60">{label}</p>
    <p className="text-base font-semibold text-black">{value || 'Not provided'}</p>
  </div>
);

const Profile = () => {
  const dispatch = useDispatch();
  const { user, status } = useSelector((state) => state.auth);

  // Local state for form inputs
  const [formData, setFormData] = useState({
    address: user?.address || '',
    phone: user?.phone || '',
    city: user?.city || ''
  });

  // Show form if user info incomplete
  const [showForm, setShowForm] = useState(!user?.address || !user?.phone || !user?.city);

  // Sync local state with updated Redux user info
  useEffect(() => {
    setFormData({
      address: user?.address || '',
      phone: user?.phone || '',
      city: user?.city || ''
    });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));
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

  const seoElement = (
    <SEO
      title={user?.name ? `${user.name} Account` : 'Account Profile'}
      description="Manage your saved addresses, phone number, and profile preferences for faster checkout."
      keywords={['account profile', 'FURNITURE account settings']}
      noIndex
    />
  );

  if (!user) {
    return (
      <>
        {seoElement}
        <div className="container  mx-auto p-4 space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {seoElement}
      <div className="min-h-screen bg-white text-black pt-24 pb-12 px-4">
        <div className="mx-auto max-w-5xl space-y-8">
          <section className="rounded-3xl border border-black/10 overflow-hidden">
            <div className="flex flex-col gap-6 px-8 py-10 text-white bg-black md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-28 w-28 border border-white/30">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="text-3xl bg-black">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">Profile</p>
                  <h1 className="text-3xl font-semibold">{user?.name}</h1>
                  <p className="text-white/70">{user?.email}</p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 text-sm text-white/70 md:items-end">
                <p>Account Status</p>
                <span className="rounded-full border border-white/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white">
                  Active
                </span>
              </div>
            </div>
            <div className="grid gap-6 px-8 py-6 bg-white sm:grid-cols-3">
              <InfoItem label="Phone" value={user?.phone} />
              <InfoItem label="City" value={user?.city?.slice(0, 20)?.toUpperCase()} />
              <InfoItem label="Address" value={user?.address?.slice(0, 56)} />
            </div>
          </section>

          <Card className="rounded-3xl border border-black/10 shadow-none">
            <CardHeader className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-black/50">Settings</p>
              <CardTitle className="text-2xl font-semibold">Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full border border-black/10 bg-black text-white">
                  <TabsTrigger
                    value="profile"
                    className="rounded-full text-sm text-white/70 data-[state=active]:bg-white data-[state=active]:text-black"
                  >
                    Profile Info
                  </TabsTrigger>
                  <TabsTrigger
                    value="addresses"
                    className="rounded-full text-sm text-white/70 data-[state=active]:bg-white data-[state=active]:text-black"
                  >
                    Addresses
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="pt-8">
                  {!showForm ? (
                    <div className="grid gap-8 md:grid-cols-2">
                      <div className="space-y-6 rounded-2xl border border-black/10 p-6">
                        <h3 className="text-sm uppercase tracking-[0.3em] text-black/50">Contact</h3>
                        <InfoItem label="Email" value={user?.email} />
                        <InfoItem label="Phone" value={user?.phone} />
                      </div>
                      <div className="space-y-6 rounded-2xl border border-black/10 p-6">
                        <h3 className="text-sm uppercase tracking-[0.3em] text-black/50">Location</h3>
                        <InfoItem label="City" value={user?.city?.slice(0, 20)?.toUpperCase()} />
                        <InfoItem label="Address" value={user?.address} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 rounded-2xl border border-black/10 p-6">
                      <h2 className="text-xl font-semibold">Update Profile Information</h2>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="phone" className="text-xs uppercase tracking-[0.3em] text-black/60">
                            Phone Number
                          </label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            className="border-black/30 bg-white text-black focus-visible:ring-black"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="city" className="text-xs uppercase tracking-[0.3em] text-black/60">
                            City
                          </label>
                          <Input
                            id="city"
                            name="city"
                            type="text"
                            value={formData.city}
                            onChange={handleChange}
                            required
                            maxLength={20}
                            className="border-black/30 bg-white text-black focus-visible:ring-black"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label htmlFor="address" className="text-xs uppercase tracking-[0.3em] text-black/60">
                            Address
                          </label>
                          <Textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            required
                            rows={4}
                            className="border-black/30 bg-white text-black focus-visible:ring-black"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="addresses" className="pt-8">
                  <div className="rounded-2xl border border-black/10 p-4">
                    <AddressManager />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-black/10 py-6 md:flex-row md:items-center md:justify-end">
              {!showForm ? (
                <Button onClick={() => setShowForm(true)} variant="outline" className="border-black text-black">
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setShowForm(false)}
                    variant="outline"
                    disabled={status === 'loading'}
                    className="border-black text-black"
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
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Profile;