import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usePagination } from '@/hooks/use-pagination';
import { Button } from '../ui/button';
import {
  Dialog,
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
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import OrderData from './OrderData';
import { fetchOrdersAdmin, updateOrderStatus, fetchPendingOrderCount, deleteOrder, bulkDeleteOrders } from '@/redux/slices/order/orderSlice';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';
import { CalendarDays, Share2, FileDown, Trash2, Package, ShoppingBag, Clock, CheckCircle } from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DataTable } from './data-table/DataTable';
import { DataTablePagination } from './data-table/DataTablePagination';
import { DataTableToolbar } from './data-table/DataTableToolbar';
import { useDataTable } from './data-table/useDataTable';
import { buildOrderColumns } from './data-table/orders-columns';

const getPakistaniDate = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
};

const Orders = () => {
  const dispatch = useDispatch();
  const { orders, status, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getPakistaniDate());
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [packerNames, setPackerNames] = useState({});
  const [limit, setLimit] = useState(24);
  const [rowSelection, setRowSelection] = useState({});
  const totalItems = useSelector((state) => state.orders.totalItems) || 0;
  const [pdfLoading, setPdfLoading] = useState(false);

  // Use pagination hook to eliminate pagination duplication
  const pagination = usePagination({
    initialPage: 1,
    initialLimit: 24,
    totalItems,
    onPageChange: (page) => {
      dispatch(fetchOrdersAdmin({ page, limit, status: statusFilter }));
    }
  });

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
      await dispatch(
        updateOrderStatus({
          orderId,
          status: newStatus,
          packerName: packerNames[orderId] || ''
        })
      ).unwrap();

      toast.success(`Order marked as ${newStatus}`);
      dispatch(fetchPendingOrderCount());
    } catch (error) {
      toast.error(error?.message || 'Failed to update order status');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await dispatch(deleteOrder(orderId)).unwrap();
      toast.success('Order deleted successfully and stock restored');
      dispatch(fetchPendingOrderCount());
    } catch (error) {
      toast.error(error?.message || 'Failed to delete order');
    } finally {
      setDeleteOrderId(null);
    }
  };

  const handleDeleteAllOrders = async () => {
    try {
      const allOrderIds = filteredOrders.map(order => order._id);
      await dispatch(bulkDeleteOrders(allOrderIds)).unwrap();
      toast.success(`All ${allOrderIds.length} orders deleted successfully and stock restored`);
      dispatch(fetchPendingOrderCount());
    } catch (error) {
      toast.error(error?.message || 'Failed to delete all orders');
    }
  };

  const handleDeleteSelectedOrders = async (orderIds) => {
    try {
      await dispatch(bulkDeleteOrders(orderIds)).unwrap();
      toast.success(`${orderIds.length} order(s) deleted successfully and stock restored`);
      setRowSelection({});
      dispatch(fetchPendingOrderCount());
    } catch (error) {
      toast.error(error?.message || 'Failed to delete selected orders');
    }
  };

  const handleLimitChange = (newLimit) => {
    const newLimitValue = parseInt(newLimit);
    setLimit(newLimitValue);
    pagination.resetPagination();
    dispatch(fetchOrdersAdmin({ page: 1, limit: newLimitValue }));
  };

  useEffect(() => {
    dispatch(fetchOrdersAdmin({ page: pagination.currentPage, limit }));
  }, [dispatch, pagination.currentPage, limit]);

  useEffect(() => {
    if (status === 'succeeded') {
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
    });

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
  };

  const handlePdfClick = async (order) => {
    setPdfLoading(true);
    await handleSharePDF(order, { download: true });
    setPdfLoading(false);
  };

  const handleSharePDF = async (order, { download = false } = {}) => {
    const tableRows = await Promise.all(
      order.products.map(async (p) => {
        const imgUrl = p.id?.picture?.secure_url || "/placeholder-product.jpg";
        let imgData = "";
        try {
          imgData = await getImageBase64(imgUrl);
        } catch {
          imgData = "";
        }
        return [
          { content: "", img: imgData },
          p.id?.title || "",
          p.quantity || "",
          p.id?.price ? `Rs. ${p.id.price}` : "",
        ];
      })
    );

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(user?.name || 'User Name', doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Amount: Rs. ${order.amount}`, 14, 28);
    doc.text(`Shipping: ${order.address}, ${order.city}, ${order.phone}`, 14, 34);

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
      styles: { valign: "middle", fontSize: 10, cellPadding: 2, textColor: [0, 0, 0], halign: "left" },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: "left" },
      bodyStyles: { minCellHeight: 49, halign: "left" },
      theme: 'grid',
    });

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
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Order-${order._id.slice(-6)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const pendingOrders = orders.filter(order => order.status === 'Pending').length;
  const completedOrders = orders.filter(order => order.status === 'Completed').length;

  const orderColumns = React.useMemo(() => buildOrderColumns({
    packerNames,
    onPackerNameChange: handlePackerNameChange,
    onStatusUpdate: handleStatusUpdate,
    onView: handleView,
    onShare: handleShare,
    onDownloadPdf: handlePdfClick,
    onDelete: setDeleteOrderId,
  }), [packerNames]);

  const table = useDataTable({
    columns: orderColumns,
    data: filteredOrders,
    manualPagination: true,
    pageCount: pagination.totalPages || 1,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row._id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
        <p className="text-sm text-muted-foreground">Manage and track customer orders efficiently</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-2xl font-bold">{pendingOrders}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedOrders}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </CardContent>
        </Card>
      </div>

      <DataTableToolbar
        left={
          <>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all" onClick={() => setStatusFilter('All')}>All</TabsTrigger>
                <TabsTrigger value="pending" onClick={() => setStatusFilter('Pending')}>Pending</TabsTrigger>
                <TabsTrigger value="completed" onClick={() => setStatusFilter('Completed')}>Completed</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button variant={showAll ? 'default' : 'outline'} onClick={() => setShowAll(!showAll)} className="gap-2">
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
          </>
        }
        right={
          <>
            {Object.keys(rowSelection).length > 0 && (
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => handleDeleteSelectedOrders(table.getFilteredSelectedRowModel().rows.map((r) => r.original._id))}
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({Object.keys(rowSelection).length})
              </Button>
            )}
            {filteredOrders.length > 0 && (
              <Button variant="destructive" className="gap-2" onClick={handleDeleteAllOrders}>
                <Trash2 className="h-4 w-4" />
                Delete All ({filteredOrders.length})
              </Button>
            )}
          </>
        }
      />

      <DataTable table={table} isLoading={status === 'loading'} />

      <DataTablePagination mode="server" pager={pagination} selectedCount={Object.keys(rowSelection).length} />

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details - #{selectedOrder?._id?.slice(-6)}
            </DialogTitle>
            <DialogDescription>Complete information for this order</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleShare(selectedOrder)} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePdfClick(selectedOrder)} className="gap-2" disabled={pdfLoading}>
                  <FileDown className="h-4 w-4" />
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action will:
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Permanently remove the order from the system</li>
                <li>Restore the product stock that was deducted</li>
                <li>This action cannot be undone</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteOrder(deleteOrderId)} className="bg-destructive hover:bg-destructive/90">
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Orders;
