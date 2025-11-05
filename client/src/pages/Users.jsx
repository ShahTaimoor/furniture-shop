import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { updateUserRole } from '../redux/slices/auth/authSlice';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import OneLoader from '../components/ui/OneLoader';
import { 
  Shield, 
  User, 
  Crown, 
  RefreshCw, 
  Users as UsersIcon, 
  MapPin, 
  Phone, 
  Building2,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingRoles, setUpdatingRoles] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);

  const getAllUsers = () => {
    setLoading(true);
    fetch(import.meta.env.VITE_API_URL + '/all-users', {
      credentials: 'include',
      headers: { "Content-Type": "application/json" }
    })
      .then((response) => response.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : data?.users || []);
      })
      .catch((error) => {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRoles(prev => ({ ...prev, [userId]: true }));
    
    try {
      const result = await dispatch(updateUserRole({ userId, role: parseInt(newRole) })).unwrap();
      
      if (result.success) {
        toast.success('User role updated successfully');
        // Update the local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId 
              ? { ...user, role: parseInt(newRole) }
              : user
          )
        );
      } else {
        toast.error(result.message || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Role change error:', error);
      toast.error(error || 'Failed to update user role');
    } finally {
      setUpdatingRoles(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 0:
        return { label: 'User', color: 'bg-blue-100 text-blue-800', icon: User };
      case 1:
        return { label: 'Admin', color: 'bg-green-100 text-green-800', icon: Shield };
      case 2:
        return { label: 'Super Admin', color: 'bg-purple-100 text-purple-800', icon: Crown };
      default:
        return { label: 'User', color: 'bg-blue-100 text-blue-800', icon: User };
    }
  };

  const getRoleIcon = (role) => {
    const { icon: Icon } = getRoleLabel(role);
    return <Icon className="h-4 w-4" />;
  };

  // Filter users based on search term and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm);
    
    const matchesRole = roleFilter === 'all' || user.role.toString() === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  // Get user statistics
  const userStats = {
    total: users.length,
    users: users.filter(u => u.role === 0).length,
    admins: users.filter(u => u.role === 1).length,
    superAdmins: users.filter(u => u.role === 2).length
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <OneLoader size="large" text="Loading Users..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                <p className="text-slate-600">Manage user roles and permissions</p>
              </div>
            </div>
            <Button 
              onClick={getAllUsers} 
              variant="outline" 
              size="sm"
              className="border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Users</p>
                <p className="text-2xl font-bold text-slate-800">{userStats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <UsersIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Regular Users</p>
                <p className="text-2xl font-bold text-blue-600">{userStats.users}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Admins</p>
                <p className="text-2xl font-bold text-green-600">{userStats.admins}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Super Admins</p>
                <p className="text-2xl font-bold text-purple-600">{userStats.superAdmins}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name, address, city, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="0">Users</SelectItem>
                  <SelectItem value="1">Admins</SelectItem>
                  <SelectItem value="2">Super Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    #
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    User Details
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    Contact Info
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    Current Role
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedUsers.map((user, index) => {
                  const { label: roleLabel, color: roleColor } = getRoleLabel(user.role);
                  const isUpdating = updatingRoles[user._id];
                  const isCurrentUser = currentUser?._id === user._id;
                  
                  return (
                    <tr
                      key={user._id || index}
                      className="hover:bg-slate-50 transition-colors duration-150"
                    >
                      <td className="py-4 px-6 text-sm font-medium text-slate-600">
                        {index + 1}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg">
                            <Building2 className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 capitalize">{user.name}</div>
                            <div className="text-sm text-slate-500">User #{index + 1}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {user.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 text-slate-400 mt-1 flex-shrink-0" />
                              <span className="text-sm text-slate-600" title={user.address}>
                                {user.address.length > 40 
                                  ? `${user.address.substring(0, 40)}...` 
                                  : user.address
                                }
                              </span>
                            </div>
                          )}
                          {user.city && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span className="text-sm text-slate-600">{user.city}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span className="text-sm text-slate-600">{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={`${roleColor} flex items-center gap-1 w-fit`}>
                          {getRoleIcon(user.role)}
                          {roleLabel}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {currentUser?.role === 2 ? (
                            isCurrentUser ? (
                              <span className="text-sm text-amber-600 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                Cannot change own role
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={user.role.toString()}
                                  onValueChange={(value) => handleRoleChange(user._id, value)}
                                  disabled={isUpdating}
                                >
                                  <SelectTrigger className="w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        User
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="1">
                                      <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Admin
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="2">
                                      <div className="flex items-center gap-2">
                                        <Crown className="h-4 w-4" />
                                        Super Admin
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {isUpdating && (
                                  <OneLoader size="small" text="Updating..." showText={false} />
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Only Super Admin can change roles
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredUsers.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Show</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-slate-600">per page</span>
              </div>

              {/* Page info */}
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-slate-300 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={page === '...'}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : page === '...'
                          ? 'text-slate-400 cursor-default'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-slate-300 hover:bg-slate-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredUsers.length === 0 && users.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No users found</h3>
            <p className="text-slate-600">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {users.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <UsersIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No users found</h3>
            <p className="text-slate-600">No users have been registered yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;