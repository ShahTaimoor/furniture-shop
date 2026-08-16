import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axiosInstance from '@/redux/slices/auth/axiosInstance';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Home, 
  Building2, 
  MoreVertical,
  Check,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import OneLoader from '@/components/ui/OneLoader';

const AddressManager = ({ onSelectAddress, selectedAddressId = null }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    type: 'home',
    fullName: '',
    phone: '',
    altPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Pakistan',
    deliveryInstructions: '',
    landmark: '',
    isDefault: false
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/pg/addresses');
      setAddresses(response.data.addresses || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      if (editingAddress) {
        await axiosInstance.put(`/pg/addresses/${editingAddress._id}`, formData);
        toast.success('Address updated successfully');
      } else {
        await axiosInstance.post('/pg/addresses', formData);
        toast.success('Address added successfully');
      }
      setOpenDialog(false);
      resetForm();
      fetchAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error(error?.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setFormData({
      type: address.type || 'home',
      fullName: address.fullName || '',
      phone: address.phone || '',
      altPhone: address.altPhone || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || 'Pakistan',
      deliveryInstructions: address.deliveryInstructions || '',
      landmark: address.landmark || '',
      isDefault: address.isDefault || false
    });
    setOpenDialog(true);
  };

  const handleDelete = async (addressId) => {
    try {
      setLoading(true);
      await axiosInstance.delete(`/pg/addresses/${addressId}`);
      toast.success('Address deleted successfully');
      fetchAddresses();
      if (selectedAddressId === addressId && onSelectAddress) {
        onSelectAddress(null);
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    } finally {
      setLoading(false);
      setDeleteConfirm(null);
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      setLoading(true);
      await axiosInstance.patch(`/pg/addresses/${addressId}/set-default`);
      toast.success('Default address updated');
      fetchAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to set default address');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingAddress(null);
    setFormData({
      type: 'home',
      fullName: '',
      phone: '',
      altPhone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Pakistan',
      deliveryInstructions: '',
      landmark: '',
      isDefault: false
    });
  };

  const getAddressIcon = (type) => {
    switch (type) {
      case 'home':
        return <Home className="h-4 w-4" />;
      case 'work':
        return <Building2 className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const formatAddress = (address) => {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  if (loading && addresses.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <OneLoader size="medium" text="Loading addresses..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shipping Addresses</h3>
        <Dialog open={openDialog} onOpenChange={(open) => {
          setOpenDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Address
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
              <DialogDescription>
                Enter your shipping address details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Address Type</Label>
                  <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altPhone">Alternate Phone</Label>
                  <Input
                    id="altPhone"
                    name="altPhone"
                    type="tel"
                    value={formData.altPhone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
                <Textarea
                  id="deliveryInstructions"
                  name="deliveryInstructions"
                  value={formData.deliveryInstructions}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Any special delivery instructions..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  Set as default address
                </Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <OneLoader size="small" showText={false} /> : (editingAddress ? 'Update' : 'Add')} Address
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No addresses saved yet. Add your first address to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card 
              key={address._id} 
              className={`relative cursor-pointer transition-all ${
                selectedAddressId === address._id ? 'ring-2 ring-primary' : ''
              } ${onSelectAddress ? 'hover:shadow-md' : ''}`}
              onClick={() => onSelectAddress && onSelectAddress(address._id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getAddressIcon(address.type)}
                    <CardTitle className="text-base capitalize">{address.type}</CardTitle>
                    {address.isDefault && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!address.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(address._id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(address);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(address._id);
                      }}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{address.fullName}</p>
                <p className="text-muted-foreground">{address.phone}</p>
                <p className="text-muted-foreground">{formatAddress(address)}</p>
                {address.deliveryInstructions && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    Note: {address.deliveryInstructions}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddressManager;

