import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { changePassword, updateUsername } from '@/redux/slices/auth/authSlice';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OneLoader from '@/components/ui/OneLoader';
import { Eye, EyeOff, User, Lock, Shield } from 'lucide-react';

const AdminProfile = () => {
  const dispatch = useDispatch();
  const { user, status } = useSelector((state) => state.auth);

  // Username change state
  const [usernameData, setUsernameData] = useState({
    newUsername: user?.name || ''
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Show/hide password states
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState('username');

  // Sync username with user data
  useEffect(() => {
    setUsernameData({
      newUsername: user?.name || ''
    });
  }, [user]);

  const handleUsernameChange = (e) => {
    const { value } = e.target;
    setUsernameData({ newUsername: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleUsernameSubmit = () => {
    if (!usernameData.newUsername.trim()) {
      toast.error('Username is required');
      return;
    }

    if (usernameData.newUsername === user?.name) {
      toast.error('New username must be different from current username');
      return;
    }

    dispatch(updateUsername({ newUsername: usernameData.newUsername }))
      .unwrap()
      .then(() => {
        toast.success('Username updated successfully');
      })
      .catch((err) => {
        console.error(err);
        toast.error(err || 'Failed to update username');
      });
  };

  const handlePasswordSubmit = () => {
    const { oldPassword, newPassword, confirmPassword } = passwordData;

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    if (oldPassword === newPassword) {
      toast.error('New password must be different from old password');
      return;
    }

    dispatch(changePassword(passwordData))
      .unwrap()
      .then(() => {
        toast.success('Password changed successfully');
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      })
      .catch((err) => {
        console.error(err);
        toast.error(err || 'Failed to change password');
      });
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case 0:
        return { label: 'User', color: 'bg-blue-100 text-blue-800', icon: User };
      case 1:
        return { label: 'Admin', color: 'bg-green-100 text-green-800', icon: Shield };
      case 2:
        return { label: 'Super Admin', color: 'bg-purple-100 text-purple-800', icon: Shield };
      default:
        return { label: 'User', color: 'bg-blue-100 text-blue-800', icon: User };
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  const roleInfo = getRoleInfo(user.role);

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
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">{user?.name}</CardTitle>
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${roleInfo.color}`}>
              <roleInfo.icon className="h-4 w-4" />
              {roleInfo.label}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="username" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Change Username
              </TabsTrigger>
              <TabsTrigger value="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Change Password
              </TabsTrigger>
            </TabsList>

            <TabsContent value="username" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Update Username</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Change your username. This will be visible to other users.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative w-full">
                    <input
                      id="newUsername"
                      name="newUsername"
                      type="text"
                      placeholder=" "
                      value={usernameData.newUsername}
                      onChange={handleUsernameChange}
                      required
                      className="peer w-full border border-gray-300 rounded-md px-3 pt-4 pb-2 text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                    />
                    <label
                      htmlFor="newUsername"
                      className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700]"
                    >
                      New Username
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="password" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Change Password</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update your password to keep your account secure.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Old Password */}
                  <div className="relative w-full">
                    <input
                      id="oldPassword"
                      name="oldPassword"
                      type={showPasswords.old ? "text" : "password"}
                      placeholder=" "
                      value={passwordData.oldPassword}
                      onChange={handlePasswordChange}
                      required
                      className="peer w-full border border-gray-300 rounded-md px-3 pt-4 pb-2 pr-10 text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                    />
                    <label
                      htmlFor="oldPassword"
                      className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700]"
                    >
                      Current Password
                    </label>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('old')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* New Password */}
                  <div className="relative w-full">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      placeholder=" "
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      className="peer w-full border border-gray-300 rounded-md px-3 pt-4 pb-2 pr-10 text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                    />
                    <label
                      htmlFor="newPassword"
                      className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700]"
                    >
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Confirm Password */}
                  <div className="relative w-full">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      placeholder=" "
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      className="peer w-full border border-gray-300 rounded-md px-3 pt-4 pb-2 pr-10 text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-[#FED700] focus:border-[#FED700]"
                    />
                    <label
                      htmlFor="confirmPassword"
                      className="absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-[#FED700] 
        transition-all duration-200 ease-in-out pointer-events-none
        peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground 
        peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#FED700]"
                    >
                      Confirm New Password
                    </label>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-end items-center space-x-3 pt-4">
          <Button
            onClick={() => {
              if (activeTab === 'username') {
                handleUsernameSubmit();
              } else if (activeTab === 'password') {
                handlePasswordSubmit();
              }
            }}
            disabled={status === 'loading'}
            className="flex items-center gap-2"
          >
            {status === 'loading' ? (
              <OneLoader size="small" text="Saving..." showText={false} />
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminProfile;
