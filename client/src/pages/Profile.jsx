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
import OneLoader from '@/components/ui/OneLoader';

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

  if (!user) {
    return (
      <div className="container  mx-auto p-4 space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-20 mx-auto p-4 max-w-4xl">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary h-32 relative">
          <div className="absolute -bottom-16 left-6">
            <Avatar className="w-32 h-32 border-4 border-background">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="text-3xl bg-background">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <CardHeader className="pt-20">
          <CardTitle className="text-3xl">{user?.name}</CardTitle>
        </CardHeader>

        <CardContent>
          {!showForm ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">

                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-lg font-medium">{user?.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-lg font-medium overflow-hidden">{user?.address.slice(0, 56).toUpperCase() || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="text-lg font-medium">{user?.city.slice(0, 20).toUpperCase() || 'Not provided'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Update Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Phone */}
                  <div className="relative w-full">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder=" "
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="peer w-full border border-gray-300 rounded-md px-3 pt-4 pb-2 text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                    />
                    <label
                      htmlFor="phone"
                      className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700]"
                    >
                      Phone Number
                    </label>
                  </div>

                  {/* City */}
                  <div className="relative w-full">
                    <input
                      id="city"
                      name="city"
                      type="text"
                      placeholder=" "
                      value={formData.city.slice(0, 20)}
                      onChange={handleChange}
                      required
                      className="peer w-full border border-gray-300 rounded-md px-3 pt-4 pb-2 text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                    />
                    <label
                      htmlFor="city"
                      className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700]"
                    >
                      City
                    </label>
                  </div>

                  {/* Address */}
                  <div className="relative w-full">
                    <textarea
                      id="address"
                      name="address"
                      placeholder=" "
                      value={formData.address}
                      onChange={handleChange}
                      required
                      rows={3}
                      className="peer w-full border border-gray-300 rounded-md px-3 pt-4 pb-2 text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                    />
                    <label
                      htmlFor="address"
                      className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700]"
                    >
                      Address
                    </label>
                  </div>
                </div>

              </div>
            </div>
          )}
        </CardContent>

       <CardFooter className="flex justify-end items-center space-x-3 pt-4">
  {!showForm ? (
    <Button onClick={() => setShowForm(true)} variant="outline">
      Edit Profile
    </Button>
  ) : (
    <>
      <Button
        onClick={() => setShowForm(false)}
        variant="outline"
        disabled={status === 'loading'}
      >
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={status === 'loading'}
        className="flex items-center gap-2"
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
  );
};

export default Profile;