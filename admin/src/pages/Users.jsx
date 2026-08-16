import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { updateUserRole } from '../redux/slices/auth/authSlice';
import { toast } from 'sonner';
import OneLoader from '../components/ui/OneLoader';
import SEO from '@/components/seo/SEO';
import { Card, CardContent } from '../components/ui/card';
import { Crown, Filter, RefreshCw, Search, Shield, User, Users as UsersIcon } from 'lucide-react';
import { killAllUserSessions } from '../api/userService';
import { DataTable } from '../components/custom/data-table/DataTable';
import { DataTablePagination } from '../components/custom/data-table/DataTablePagination';
import { DataTableToolbar } from '../components/custom/data-table/DataTableToolbar';
import { useDataTable } from '../components/custom/data-table/useDataTable';
import { buildUserColumns } from '../components/custom/data-table/users-columns';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingRoles, setUpdatingRoles] = useState({});
  const [killingSessions, setKillingSessions] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const seoElement = (
    <SEO
      title="Admin Users Directory"
      description="Review customer accounts, roles, and permissions from the Ecommerce admin console."
      keywords={['user management', 'admin users', 'Ecommerce admin']}
      noIndex
    />
  );

  const getAllUsers = () => {
    setLoading(true);
    fetch(import.meta.env.VITE_API_URL + '/pg/all-users', {
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

  const handleKillAllSessions = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to kill all sessions for ${userName}? This will log them out from all devices.`)) {
      return;
    }

    setUpdatingRoles(prev => ({ ...prev, [userId]: true }));
    setKillingSessions(prev => ({ ...prev, [userId]: true }));

    try {
      const response = await killAllUserSessions(userId);
      if (response?.success) {
        toast.success(`All sessions killed successfully for ${userName}`);
      } else {
        throw new Error(response?.message || 'Failed to kill all sessions');
      }
    } catch (error) {
      console.error('Error killing all sessions:', error);
      toast.error(error?.message || 'Failed to kill all sessions');
    } finally {
      setUpdatingRoles(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
      setKillingSessions(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRoles(prev => ({ ...prev, [userId]: true }));

    try {
      const result = await dispatch(updateUserRole({ userId, role: parseInt(newRole) })).unwrap();

      if (result.success) {
        toast.success('User role updated successfully');
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

  useEffect(() => {
    getAllUsers();
  }, []);

  const userStats = useMemo(() => ({
    total: users.length,
    users: users.filter(u => u.role === 0).length,
    admins: users.filter(u => u.role === 1).length,
    superAdmins: users.filter(u => u.role === 2).length
  }), [users]);

  const userColumns = useMemo(() => buildUserColumns({
    currentUser,
    updatingRoles,
    killingSessions,
    onRoleChange: handleRoleChange,
    onKillSessions: handleKillAllSessions,
  }), [currentUser, updatingRoles, killingSessions]);

  const globalFilterFn = (row, _columnId, filterValue) => {
    const term = filterValue.toLowerCase();
    const u = row.original;
    return (
      u.name?.toLowerCase().includes(term) ||
      u.address?.toLowerCase().includes(term) ||
      u.city?.toLowerCase().includes(term) ||
      u.phone?.includes(filterValue)
    );
  };

  const table = useDataTable({
    columns: userColumns,
    data: users,
    manualPagination: false,
    sorting,
    onSortingChange: setSorting,
    globalFilter,
    onGlobalFilterChange: setGlobalFilter,
    columnFilters,
    onColumnFiltersChange: setColumnFilters,
    pagination,
    onPaginationChange: setPagination,
    getRowId: (row) => row._id,
    globalFilterFn,
  });

  if (loading) {
    return (
      <>
        {seoElement}
        <div className="flex min-h-[60vh] items-center justify-center">
          <OneLoader size="large" text="Loading Users..." />
        </div>
      </>
    );
  }

  return (
    <>
      {seoElement}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <UsersIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage user roles and permissions</p>
            </div>
          </div>
          <Button onClick={getAllUsers} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">Regular Users</p>
                <p className="text-2xl font-bold">{userStats.users}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{userStats.admins}</p>
              </div>
              <Shield className="h-8 w-8 text-emerald-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">Super Admins</p>
                <p className="text-2xl font-bold">{userStats.superAdmins}</p>
              </div>
              <Crown className="h-8 w-8 text-purple-500" />
            </CardContent>
          </Card>
        </div>

        <DataTableToolbar
          left={
            <>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, address, city, or phone..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={(table.getColumn('role')?.getFilterValue()) ?? 'all'}
                onValueChange={(value) => table.getColumn('role')?.setFilterValue(value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="0">Users</SelectItem>
                  <SelectItem value="1">Admins</SelectItem>
                  <SelectItem value="2">Super Admins</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />

        <DataTable table={table} isLoading={false} />

        <DataTablePagination mode="client" table={table} rowsPerPageOptions={[5, 10, 20, 50]} />
      </div>
    </>
  );
};

export default Users;
