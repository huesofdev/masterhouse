import { Request, Response } from "express";
import { ReportsService } from "./reports.service";

export const getStockReport = async (req: Request, res: Response) => {
  try {
    const warehouseId = req.query.warehouseId as string;
    const brandId = req.query.brandId as string;
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    const { data, total, summary } = await ReportsService.getStockReport(warehouseId, page, limit, brandId);
    res.json({ success: true, data, total, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportStockReport = async (req: Request, res: Response) => {
  try {
    const warehouseId = req.query.warehouseId as string;
    const brandId = req.query.brandId as string;
    const { data } = await ReportsService.getStockReport(warehouseId, undefined, undefined, brandId);

    const columns = [
      { header: 'Product Name', key: 'productName', width: 30 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Warehouse', key: 'warehouseName', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Avg Cost (Rs.)', key: 'avgCost', width: 20 },
      { header: 'Total Worth (Rs.)', key: 'totalWorth', width: 25 },
    ];

    const buffer = await ReportsService.generateExcel('Stock Report', columns, data);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Stock_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: req.query.branchId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      saleType: req.query.saleType as string,
      status: req.query.status as string,
      userId: req.query.userId as string,
      source: req.query.source as string,
      routeId: req.query.routeId as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const { data, total, summary } = await ReportsService.getSalesReport(filters);
    res.json({ success: true, data, total, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportSalesReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: req.query.branchId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      saleType: req.query.saleType as string,
      status: req.query.status as string,
      userId: req.query.userId as string,
      source: req.query.source as string,
      routeId: req.query.routeId as string,
    };
    const { data } = await ReportsService.getSalesReport(filters);

    const formattedData = data.map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString(),
    }));

    const columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Branch', key: 'branchName', width: 20 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Products', key: 'products', width: 30 },
      { header: 'Sale Type', key: 'saleType', width: 15 },
      { header: 'Payment Mode', key: 'paymentMode', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created By', key: 'createdBy', width: 20 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Total Value', key: 'total', width: 15 },
      { header: 'Received Amount', key: 'receivedAmount', width: 18 },
      { header: 'Pending Balance', key: 'pendingAmount', width: 18 },
    ];

    const buffer = await ReportsService.generateExcel('Sales Report', columns, formattedData);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Sales_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCollectionsReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      scheduleStatus: req.query.scheduleStatus as string,
      routeId: req.query.routeId as string,
      branchId: req.query.branchId as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const { data, total, summary } = await ReportsService.getCollectionsReport(filters);
    res.json({ success: true, data, total, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportCollectionsReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      scheduleStatus: req.query.scheduleStatus as string,
      routeId: req.query.routeId as string,
      branchId: req.query.branchId as string,
    };
    const { data } = await ReportsService.getCollectionsReport(filters);

    const formattedData = data.map(d => ({
      ...d,
      createdAt: new Date(d.createdAt).toLocaleDateString(),
    }));

    const columns = [
      { header: 'Contract ID', key: 'id', width: 40 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Principal', key: 'principal', width: 15 },
      { header: 'Balance', key: 'balance', width: 15 },
      { header: 'Total Paid', key: 'paidAmount', width: 15 },
      { header: 'Pending', key: 'pendingAmount', width: 15 },
      { header: 'Overdue', key: 'overdueAmount', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 15 },
    ];

    const buffer = await ReportsService.generateExcel('Collections Report', columns, formattedData);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Collections_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSchedulesReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      routeId: req.query.routeId as string,
      branchId: req.query.branchId as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const { data, total, summary } = await ReportsService.getSchedulesReport(filters);
    res.json({ success: true, data, total, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportSchedulesReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      routeId: req.query.routeId as string,
      branchId: req.query.branchId as string,
    };
    const { data } = await ReportsService.getSchedulesReport(filters);

    const formattedData = data.map(d => ({
      ...d,
      dueDate: new Date(d.dueDate).toLocaleDateString(),
    }));

    const columns = [
      { header: 'Installment No', key: 'installmentNumber', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Products', key: 'products', width: 30 },
      { header: 'Route', key: 'routeName', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Amount Due', key: 'amountDue', width: 15 },
      { header: 'Amount Paid', key: 'amountPaid', width: 15 },
    ];

    const buffer = await ReportsService.generateExcel('Schedules Report', columns, formattedData);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Schedules_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReceiptsReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      routeId: req.query.routeId as string,
      branchId: req.query.branchId as string,
      userId: req.query.userId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const { data, total, summary } = await ReportsService.getReceiptsReport(filters);
    res.json({ success: true, data, total, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportReceiptsReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      routeId: req.query.routeId as string,
      branchId: req.query.branchId as string,
      userId: req.query.userId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const { data } = await ReportsService.getReceiptsReport(filters);

    const formattedData = data.map(d => ({
      ...d,
      date: new Date(d.date).toLocaleString(),
    }));

    const columns = [
      { header: 'Receipt No', key: 'receiptNo', width: 20 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Products', key: 'products', width: 30 },
      { header: 'Route', key: 'routeName', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Bal. (After)', key: 'balanceAfterReceipt', width: 15 },
      { header: 'Payment Mode', key: 'paymentMode', width: 15 },
      { header: 'Collected By', key: 'collectedBy', width: 20 },
    ];

    const buffer = await ReportsService.generateExcel('Receipts Report', columns, formattedData);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Receipts_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfitLossReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      routeId: req.query.routeId as string,
      branchId: req.query.branchId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const data = await ReportsService.getProfitLossReport(filters);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCollectionEfficiencyReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      branchId: req.query.branchId as string,
    };
    const data = await ReportsService.getCollectionEfficiencyReport(filters);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpenseReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: req.query.branchId as string,
      categoryId: req.query.categoryId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const { data, total, totalAmount } = await ReportsService.getExpenseReport(filters);
    res.json({ success: true, data, total, totalAmount });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaxReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: req.query.branchId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const { data, total, totalTaxAmount } = await ReportsService.getTaxReport(filters);
    res.json({ success: true, data, total, totalTaxAmount });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportTaxReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: req.query.branchId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const { data } = await ReportsService.getTaxReport(filters);

    const formattedData = data.map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString(),
    }));

    const columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Reference', key: 'referenceNumber', width: 20 },
      { header: 'Branch', key: 'branchName', width: 20 },
      { header: 'Sale Type', key: 'saleType', width: 15 },
      { header: 'Taxable Amount (Rs.)', key: 'netAmount', width: 25 },
      { header: 'Tax Amount (Rs.)', key: 'taxAmount', width: 20 },
    ];

    const buffer = await ReportsService.generateExcel('Tax Report', columns, formattedData);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Tax_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductPerformanceReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: req.query.branchId as string,
      categoryId: req.query.categoryId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const { data, total } = await ReportsService.getProductPerformanceReport(filters);
    res.json({ success: true, data, total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportProductPerformanceReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: req.query.branchId as string,
      categoryId: req.query.categoryId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const { data } = await ReportsService.getProductPerformanceReport(filters);

    const columns = [
      { header: 'Product Name', key: 'productName', width: 30 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Category', key: 'categoryName', width: 20 },
      { header: 'Qty Sold', key: 'totalQuantitySold', width: 15 },
      { header: 'Revenue Generated (Rs.)', key: 'totalRevenue', width: 25 },
    ];

    const buffer = await ReportsService.generateExcel('Product Performance Report', columns, data);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Product_Performance_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingsReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: req.query.branchId as string,
      status: req.query.status as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const { data, total, totalAdvances } = await ReportsService.getBookingsReport(filters);
    res.json({ success: true, data, total, totalAdvances });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportBookingsReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: req.query.branchId as string,
      status: req.query.status as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const { data } = await ReportsService.getBookingsReport(filters);

    const columns = [
      { header: 'Reference', key: 'referenceNumber', width: 20 },
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Branch', key: 'branchName', width: 20 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Advance Paid', key: 'advancePayment', width: 15 },
      { header: 'Method', key: 'paymentMethod', width: 15 },
      { header: 'Items', key: 'products', width: 40 },
    ];

    const buffer = await ReportsService.generateExcel('Bookings Report', columns, data);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Bookings_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPayrollReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: (req.query.branchId as string) || (req as any).branchId || (req.headers["x-branch-id"] as string),
      userId: req.query.userId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    const { data, total, summary } = await ReportsService.getPayrollReport(filters);
    res.json({ success: true, data, total, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportPayrollReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      branchId: (req.query.branchId as string) || (req as any).branchId || (req.headers["x-branch-id"] as string),
      userId: req.query.userId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const { data } = await ReportsService.getPayrollReport(filters);

    const columns = [
      { header: 'Staff Name', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Branch', key: 'branchName', width: 20 },
      { header: 'Direct Sales Count', key: 'directSalesCount', width: 18 },
      { header: 'Direct Sales Revenue (Rs.)', key: 'directSalesAmount', width: 25 },
      { header: 'Installment Sales Count', key: 'installmentSalesCount', width: 20 },
      { header: 'Installment Downpayments (Rs.)', key: 'downpaymentsCollected', width: 25 },
      { header: 'Collections Count', key: 'receiptsCount', width: 18 },
      { header: 'Installment Collections (Rs.)', key: 'collectionsAmount', width: 25 },
      { header: 'Total Money Handled (Rs.)', key: 'totalMoneyHandled', width: 25 },
    ];

    const buffer = await ReportsService.generateExcel('Payroll & Performance Report', columns, data);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Payroll_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyStatsReport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const data = await ReportsService.getMyStats(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSerialLifecycleReport = async (req: Request, res: Response) => {
  try {
    const serials = req.body?.serials || req.query?.serials;
    if (!serials) {
      return res.status(400).json({ success: false, message: "Please provide serial numbers" });
    }
    const result = await ReportsService.getSerialLifecycleReport(serials);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[SerialLifecycleReport Error]', error);
    res.status(500).json({ success: false, message: error.message || "Error generating serial lifecycle report" });
  }
};

export const exportSerialLifecycleReport = async (req: Request, res: Response) => {
  try {
    const serials = req.body?.serials || req.query?.serials;
    if (!serials) {
      return res.status(400).json({ success: false, message: "Please provide serial numbers" });
    }
    const { data } = await ReportsService.getSerialLifecycleReport(serials);

    const exportRows = data.map((item: any) => ({
      serial_number: item.serial_number,
      status: item.status,
      product_name: item.product?.name || '-',
      product_sku: item.product?.sku || '-',
      brand: item.product?.brand || '-',
      supplier_name: item.intake?.supplier_name || '-',
      intake_ref: item.intake?.intake_ref || '-',
      unit_cost: item.intake?.unit_cost || 0,
      warehouse: item.intake?.warehouse_name || '-',
      sale_type: item.sale?.sale_type || 'NOT_SOLD',
      sale_ref: item.sale?.reference_number || '-',
      seller_rep: item.sale?.rep?.name || '-',
      customer_name: item.sale?.customer?.name || '-',
      customer_nic: item.sale?.customer?.nic || '-',
      contract_status: item.installment?.status || '-',
      total_contract_value: item.installment?.total_contract_value || item.sale?.total || 0,
      downpayment_collected: item.installment?.downpayment_collected || item.sale?.downpayment || 0,
      paid_terms: item.installment ? `${item.installment.paid_terms} / ${item.installment.total_terms}` : '-',
      total_collected: item.installment?.total_collected || item.sale?.total || 0,
      remaining_balance: item.installment?.remaining_balance || 0,
    }));

    const columns = [
      { header: 'Serial Number', key: 'serial_number', width: 22 },
      { header: 'Current Status', key: 'status', width: 15 },
      { header: 'Product Name', key: 'product_name', width: 25 },
      { header: 'SKU', key: 'product_sku', width: 15 },
      { header: 'Brand', key: 'brand', width: 15 },
      { header: 'Supplier', key: 'supplier_name', width: 20 },
      { header: 'Intake Ref', key: 'intake_ref', width: 18 },
      { header: 'Unit Cost (Rs.)', key: 'unit_cost', width: 16 },
      { header: 'Warehouse', key: 'warehouse', width: 18 },
      { header: 'Sale Type', key: 'sale_type', width: 15 },
      { header: 'Invoice Ref', key: 'sale_ref', width: 18 },
      { header: 'Seller Rep', key: 'seller_rep', width: 20 },
      { header: 'Customer Name', key: 'customer_name', width: 22 },
      { header: 'Customer NIC', key: 'customer_nic', width: 18 },
      { header: 'Contract Status', key: 'contract_status', width: 16 },
      { header: 'Contract Value (Rs.)', key: 'total_contract_value', width: 20 },
      { header: 'Downpayment (Rs.)', key: 'downpayment_collected', width: 20 },
      { header: 'Paid Terms', key: 'paid_terms', width: 14 },
      { header: 'Total Collected (Rs.)', key: 'total_collected', width: 20 },
      { header: 'Remaining Balance (Rs.)', key: 'remaining_balance', width: 22 },
    ];

    const buffer = await ReportsService.generateExcel('Serial Lifecycle Audit', columns, exportRows);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Serial_Lifecycle_Report.xlsx');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
