import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usePagination } from '@/hooks/use-pagination';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import OrderData from './OrderData';
import { fetchOrdersAdmin, updateOrderStatus, fetchPendingOrderCount, deleteOrder, bulkDeleteOrders } from '@/redux/slices/order/orderSlice';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  CalendarDays, 
  List, 
  Share2, 
  FileDown, 
  Trash2, 
  Filter,
  Eye,
  Clock,
  CheckCircle,
  Package,
  User,
  MapPin,
  Phone,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  Grid3X3,
  List as ListIcon,
  BarChart3
} from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const getPakistaniDate = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
};

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, status, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getPakistaniDate());
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [localOrders, setLocalOrders] = useState([]);
  const [packerNames, setPackerNames] = useState({});
  const [limit, setLimit] = useState(24);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [showFilters, setShowFilters] = useState(false);
  const totalItems = useSelector((state) => state.orders.totalItems) || 0;
  const clickTimer = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Use pagination hook to eliminate pagination duplication
  const pagination = usePagination({
    initialPage: 1,
    initialLimit: 24,
    totalItems,
    onPageChange: (page) => {
      // Fetch orders for the new page
      dispatch(fetchOrdersAdmin({ page, limit, status: statusFilter }));
    }
  });

  const statusColors = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const statusIcons = {
    Pending: Clock,
    Completed: CheckCircle,
  };

  const getImageBase64 = (url) =>
    fetch(url)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      );

  const handlePackerNameChange = (orderId, name) => {
    setPackerNames((prev) => ({
      ...prev,
      [orderId]: name,
    }));
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    if (newStatus === 'Completed') {
      const packer = packerNames[orderId];
      if (!packer) {
        toast.error('Please enter packer name first');
        return;
      }
    }
  
    try {
      const result = await dispatch(
        updateOrderStatus({ 
          orderId, 
          status: newStatus, 
          packerName: packerNames[orderId] || '' 
        })
      ).unwrap();
      
      toast.success(`Order marked as ${newStatus}`);
      
      setLocalOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? result.data : order
        )
      );
  
      dispatch(fetchPendingOrderCount());
    } catch (error) {
      toast.error(error?.message || 'Failed to update order status');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await dispatch(deleteOrder(orderId)).unwrap();
      toast.success('Order deleted successfully and stock restored');
      
      // Update local orders state
      setLocalOrders((prev) => prev.filter(order => order._id !== orderId));
      
      // Refresh pending order count
      dispatch(fetchPendingOrderCount());
    } catch (error) {
      toast.error(error?.message || 'Failed to delete order');
    }
  };

  const handleDeleteAllOrders = async () => {
    try {
      const allOrderIds = filteredOrders.map(order => order._id);
      await dispatch(bulkDeleteOrders(allOrderIds)).unwrap();
      toast.success(`All ${allOrderIds.length} orders deleted successfully and stock restored`);
      
      // Clear local orders state
      setLocalOrders([]);
      
      // Refresh pending order count
      dispatch(fetchPendingOrderCount());
    } catch (error) {
      toast.error(error?.message || 'Failed to delete all orders');
    }
  };

  const handleLimitChange = (newLimit) => {
    const newLimitValue = parseInt(newLimit);
    setLimit(newLimitValue);
    // Reset to first page when changing limit
    pagination.resetPagination();
    dispatch(fetchOrdersAdmin({ page: 1, limit: newLimitValue }));
  };

  useEffect(() => {
    dispatch(fetchOrdersAdmin({ page: pagination.currentPage, limit }));
  }, [dispatch, pagination.currentPage, limit]);

  useEffect(() => {
    if (status === 'succeeded') {
      setLocalOrders((prev) => {
        // Create a map of existing orders for quick lookup
        const orderMap = new Map(prev.map(order => [order._id, order]));
        
        // Update existing orders or add new ones
        const updatedOrders = orders.map(order => 
          orderMap.get(order._id) || order
        );
        
        // Preserve any orders that aren't in the new response
        const remainingOrders = prev.filter(order => 
          !orders.some(o => o._id === order._id)
        );
        
        return [...updatedOrders, ...remainingOrders];
      });

      // Initialize packer names
      const initialPackerNames = {};
      orders.forEach((order) => {
        if (order.packerName) {
          initialPackerNames[order._id] = order.packerName;
        }
      });
      setPackerNames((prev) => ({ ...prev, ...initialPackerNames }));
    }

    if (status === 'failed') {
      toast.error(error || 'Failed to fetch orders');
    }
  }, [status, error, orders]);

  const todayString = getPakistaniDate();

  const filteredOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter((order) => {
      if (!showAll) {
        const orderDate = new Date(order.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
        return orderDate === selectedDate;
      }
      return true;
    })
    .filter((order) => {
      if (statusFilter !== 'All') {
        return order.status?.toLowerCase() === statusFilter.toLowerCase();
      }
      return true;
    })
    ;

  const handleShare = async (order) => {
    const details = `
Order #${order._id.slice(-6)}
Status: ${order.status}
Amount: Rs. ${order.amount}
Products:
${order.products.map((p, i) =>
  `${i + 1}. ${p.id?.name} (Qty: ${p.quantity}, Price: Rs. ${p.id?.price})`
).join('\n')}
Shipping:
Address: ${order.address}
City: ${order.city}
Phone: ${order.phone}
    `.trim();

    const firstImageUrl = order.products[0]?.id?.picture?.secure_url || '/placeholder-product.jpg';

    if (navigator.canShare && navigator.canShare({ files: [] })) {
      try {
        const response = await fetch(firstImageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'order-product.jpg', { type: blob.type });

        await navigator.share({
          title: `Order #${order._id.slice(-6)}`,
          text: details,
          files: [file],
        });
      } catch (err) {
        if (navigator.share) {
          navigator.share({
            title: `Order #${order._id.slice(-6)}`,
            text: details,
          });
        } else {
          navigator.clipboard.writeText(details);
          toast.success('Order details copied to clipboard!');
        }
      }
    } else if (navigator.share) {
      navigator.share({
        title: `Order #${order._id.slice(-6)}`,
        text: details,
      });
    } else {
      navigator.clipboard.writeText(details);
      toast.success('Order details copied to clipboard!');
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(details)}`;
  };

  const handlePdfClick = async (order) => {
    setPdfLoading(true);
    await handleSharePDF(order, { download: true });
    setPdfLoading(false);
  };

  const handleSharePDF = async (order, { download = false } = {}) => {
    // 1. Prepare table data with images as base64
    const tableRows = await Promise.all(
      order.products.map(async (p) => {
        const imgUrl = p.id?.picture?.secure_url || "/placeholder-product.jpg";
        let imgData = "";
        try {
          imgData = await getImageBase64(imgUrl);
        } catch {
          imgData = ""; // fallback if image fails
        }
        return [
          { content: "", img: imgData }, // image cell
          p.id?.title || "",
          p.quantity || "",
          p.id?.price ? `Rs. ${p.id.price}` : "",
        ];
      })
    );

    // 2. Create PDF and add table
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(user?.name || 'Shop Name', doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Amount: Rs. ${order.amount}`, 14, 28);
    doc.text(`Shipping: ${order.address}, ${order.city}, ${order.phone}`, 14, 34);

    // 3. Add table with images
    autoTable(doc, {
      startY: 40,
      head: [["Image", "Title", "Qty", "Price"]],
      body: tableRows,
      didDrawCell: function (data) {
        if (data.column.index === 0 && data.cell.raw && data.cell.raw.img) {
          doc.addImage(data.cell.raw.img, "JPEG", data.cell.x + 2, data.cell.y + 2, 45, 45);
        }
      },
      columnStyles: {
        0: { cellWidth: 49 },
        1: { cellWidth: 80 },
        2: { cellWidth: 20, halign: "left" },
        3: { cellWidth: 30, halign: "left" },
      },
      styles: { valign: "middle", fontSize: 10, cellPadding: 2, textColor: [0,0,0], halign: "left" },
      headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', halign: "left" },
      bodyStyles: { minCellHeight: 49, halign: "left" },
      theme: 'grid',
    });

    // 4. Share or download PDF
    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], `Order-${order._id.slice(-6)}.pdf`, { type: "application/pdf" });

    if (!download && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: `Order Details`,
          text: "Order details attached as PDF.",
          files: [pdfFile],
        });
        return;
      } catch (err) {
        // fallback to download
      }
    }
    // Always download if double click or share not supported
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Order-${order._id.slice(-6)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const pendingOrders = orders.filter(order => order.status === 'Pending').length;
  const completedOrders = orders.filter(order => order.status === 'Completed').length;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-6 md:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Order Management</h1>
              <p className="text-gray-600 mt-1">Manage and track customer orders efficiently</p>
            </div>
            
          </div>
        </div>
      </div>

      <div className="px-4 py-6 md:px-6 lg:px-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Pending Orders</p>
                  <p className="text-2xl font-bold">{pendingOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Completed</p>
                  <p className="text-2xl font-bold">{completedOrders}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">

              {/* Status Filter */}
              <Tabs defaultValue="all" className="w-full lg:w-auto">
                <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                  <TabsTrigger value="all" onClick={() => setStatusFilter('All')}>
                    All Orders
                  </TabsTrigger>
                  <TabsTrigger value="pending" onClick={() => setStatusFilter('Pending')}>
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="completed" onClick={() => setStatusFilter('Completed')}>
                    Completed
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Date and View Controls */}
              <div className="flex gap-2">
                <Button 
                  variant={showAll ? 'default' : 'outline'} 
                  onClick={() => setShowAll(!showAll)} 
                  className="gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  {showAll ? 'Show Today' : 'Show All'}
                </Button>

                {!showAll && (
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={todayString}
                    className="w-auto"
                  />
                )}

                <Select value={limit.toString()} onValueChange={handleLimitChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="36">36</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-l-none"
                  >
                    <ListIcon className="h-4 w-4" />
                  </Button>
                </div>

                {/* Bulk Actions */}
                {filteredOrders.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="destructive" className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Bulk Actions
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleDeleteAllOrders}
                        className="text-red-600"
                      >
                        Delete All ({filteredOrders.length})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Display */}
        {status === 'loading' ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <div className="rounded-full bg-gray-100 p-4">
                <List className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {showAll ? 'No orders found' : `No ${statusFilter.toLowerCase()} orders found for ${selectedDate}`}
                </h3>
                <p className="text-gray-500 mt-1">
                  Check back later for new orders
                </p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              const StatusIcon = statusIcons[order.status] || AlertCircle;
              return (
                <Card key={order._id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-100 p-2">
                          <Package className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                         
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleString('en-US', {
                              timeZone: 'Asia/Karachi',
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${statusColors[order.status]} border`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Order Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900">Rs. {order.amount.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Products</p>
                        <p className="text-lg font-bold text-gray-900">{order.products.length}</p>
                      </div>
                    </div>

                    {/* Products Preview */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Products</p>
                      <ScrollArea className="h-32 rounded-md border bg-white">
                        <div className="p-3 space-y-2">
                          {order.products.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <img
                                src={item?.id?.picture?.secure_url || '/placeholder-product.jpg'}
                                alt={item.id?.name}
                                className="w-8 h-8 rounded-md object-cover border"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-gray-900">{item.id?.name}</p>
                                <p className="text-xs text-gray-500">
                                  Qty: {item.quantity} × Rs. {item.id?.price}
                                </p>
                              </div>
                            </div>
                          ))}
                          {order.products.length > 3 && (
                            <p className="text-xs text-gray-500 text-center">
                              +{order.products.length - 3} more products
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600"><span>Shop Name: </span>{order.userId?.name ? capitalizeFirst(order.userId.name) : 'Customer'}</span>
                      </div>
                      <div className="space-y-1">
                      <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <p className="text-sm text-gray-700"><span>Contact No: </span>{order.phone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <p className="text-sm text-gray-700"><span>City: </span>{order.city}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <p className="text-sm text-gray-700 truncate"><span>Address: </span>{order.address}</p>
                        </div>
                       
                      </div>
                    </div>

                    {/* Packer Name Input */}
                    {order.status === 'Pending' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Packer Name</label>
                        <Input
                          placeholder="Enter packer name"
                          value={packerNames[order._id] || ''}
                          onChange={(e) => handlePackerNameChange(order._id, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}

                    {/* Packer Info */}
                    {order.status === 'Completed' && order.packerName && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-800">Packed by:</span>
                        </div>
                        <p className="text-sm text-emerald-700 mt-1">{order.packerName}</p>
                      </div>
                    )}

                    {/* Status Update */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Update Status</label>
                      <Select
                        value={order.status || 'Pending'}
                        onValueChange={(newStatus) => handleStatusUpdate(order._id, newStatus)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <div className="flex gap-2 w-full">
                      <Dialog onOpenChange={(open) => open && setSelectedOrder(order)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1 gap-2">
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Package className="h-5 w-5" />
                              Order Details - #{order._id.slice(-6)}
                            </DialogTitle>
                            <DialogDescription>
                              Complete information for this order
                            </DialogDescription>
                          </DialogHeader>

                          {selectedOrder && (
                            <div className="space-y-6">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShare(selectedOrder)}
                                  className="gap-2"
                                >
                                  <Share2 className="w-4 h-4" />
                                  Share
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePdfClick(selectedOrder)}
                                  className="gap-2"
                                  disabled={pdfLoading}
                                >
                                  <FileDown className="w-4 h-4" />
                                  Download PDF
                                </Button>
                              </div>

                              <OrderData
                                price={selectedOrder.amount}
                                address={selectedOrder.address}
                                phone={selectedOrder.phone}
                                city={selectedOrder.city}
                                createdAt={selectedOrder.createdAt}
                                products={selectedOrder.products}
                                packerName={selectedOrder.packerName}
                                hideStatus={true}
                                hideCOD={true}
                                user={user}
                              />
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Order</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this order? This action will:
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Permanently remove the order from the system</li>
                                <li>Restore the product stock that was deducted</li>
                                <li>This action cannot be undone</li>
                              </ul>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteOrder(order._id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Order
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const StatusIcon = statusIcons[order.status] || AlertCircle;
                    return (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">
                          {order.userId?.name ? capitalizeFirst(order.userId.name) : 'Customer'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{order.phone}</p>
                            <p className="text-xs text-gray-500 truncate max-w-32">{order.address}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{order.products.length} items</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          Rs. {order.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[order.status]} border`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShare(order)}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePdfClick(order)}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteOrder(order._id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {orders.length > 0 && pagination.totalPages > 1 && (
          <div className="flex justify-center">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pagination.goToPreviousPage}
                    disabled={!pagination.hasPreviousPage}
                  >
                    Previous
                  </Button>
                  
                  {pagination.getVisiblePages().map((pg, index) => (
                    <Button
                      key={pg === '...' ? `ellipsis-${index}` : pg}
                      variant={pg === pagination.currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => typeof pg === 'number' && pagination.setCurrentPage(pg)}
                      disabled={pg === '...'}
                    >
                      {pg}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pagination.goToNextPage}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;