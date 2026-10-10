import { Router } from "express";
import { 
  getStockReport, 
  exportStockReport,
  getSalesReport,
  exportSalesReport,
  getCollectionsReport,
  exportCollectionsReport,
  getSchedulesReport,
  exportSchedulesReport,
  getReceiptsReport,
  exportReceiptsReport,
  getProfitLossReport,
  getCollectionEfficiencyReport,
  getExpenseReport,
  getTaxReport,
  exportTaxReport,
  getProductPerformanceReport,
  exportProductPerformanceReport,
  getBookingsReport,
  exportBookingsReport,
  getPayrollReport,
  exportPayrollReport,
  getMyStatsReport,
  getSerialLifecycleReport,
  exportSerialLifecycleReport,
  getRefundsReport,
  exportRefundsReport
} from "./reports.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();
router.use(requireAuth);

// Rep Personal Performance route (any logged-in user can access their own running month performance)
router.get("/my-stats", getMyStatsReport);

// Serial Lifecycle Audit routes
router.post("/serial-lifecycle", requirePermission("reports:view"), getSerialLifecycleReport);
router.post("/serial-lifecycle/export", requirePermission("reports:export"), exportSerialLifecycleReport);

// View reports permission required for JSON endpoints
router.get("/stock", requirePermission("reports:view"), getStockReport);
router.get("/sales", requirePermission("reports:view"), getSalesReport);
router.get("/collections", requirePermission("reports:view"), getCollectionsReport);
router.get("/schedules", requirePermission("reports:view"), getSchedulesReport);
router.get("/receipts", requirePermission("reports:view"), getReceiptsReport);
router.get("/profit-loss", requirePermission("reports:view"), getProfitLossReport);
router.get("/efficiency", requirePermission("reports:view"), getCollectionEfficiencyReport);
router.get("/expenses", requirePermission("reports:view"), getExpenseReport);
router.get("/tax", requirePermission("reports:view"), getTaxReport);
router.get("/product-performance", requirePermission("reports:view"), getProductPerformanceReport);
router.get("/bookings", requirePermission("reports:view"), getBookingsReport);
router.get("/payroll", requirePermission("reports:view"), getPayrollReport);
router.get("/refunds", requirePermission("reports:view"), getRefundsReport);

// Export reports permission required for Export endpoints
router.get("/stock/export", requirePermission("reports:export"), exportStockReport);
router.get("/sales/export", requirePermission("reports:export"), exportSalesReport);
router.get("/collections/export", requirePermission("reports:export"), exportCollectionsReport);
router.get("/schedules/export", requirePermission("reports:export"), exportSchedulesReport);
router.get("/receipts/export", requirePermission("reports:export"), exportReceiptsReport);
router.get("/tax/export", requirePermission("reports:export"), exportTaxReport);
router.get("/product-performance/export", requirePermission("reports:export"), exportProductPerformanceReport);
router.get("/bookings/export", requirePermission("reports:export"), exportBookingsReport);
router.get("/payroll/export", requirePermission("reports:export"), exportPayrollReport);
router.get("/refunds/export", requirePermission("reports:export"), exportRefundsReport);

export default router;
