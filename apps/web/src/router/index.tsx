import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PublicRoute } from '../components/PublicRoute';
import { BranchesPage } from '../features/branches/pages/BranchesPage';
import { RbacPage } from '../features/rbac/pages/RbacPage';
import { WalletsList } from '../features/wallets/pages/WalletsList';
import { WalletDetails } from '../features/wallets/pages/WalletDetails';
import { UsersPage } from '../features/users/pages/UsersPage';
import { CustomersPage } from '../features/customers/pages/CustomersPage';
import { CustomerDetailsPage } from '../features/customers/pages/CustomerDetailsPage';
import { CollectionsDashboardPage } from '../features/collections/pages/CollectionsDashboardPage';
import { SchemesPage } from '../features/schemes/pages/SchemesPage';
import { TripsPage } from '../features/operations/pages/TripsPage';
import { TripReconciliationPage } from '../features/operations/pages/TripReconciliationPage';
import { TripDetailsPage } from '../features/operations/pages/TripDetailsPage';
import { BookingsPage } from '../features/operations/pages/BookingsPage';
import { PromotionsPage } from '../features/promotions/pages/PromotionsPage';
import { LoadTripStockPage } from '../features/operations/pages/LoadTripStockPage';
import { POS2Page } from '../features/sale/pages/POS2Page';
import { QuotationsPage } from '../features/sale/pages/QuotationsPage';
import { QuotationsListPage } from '../features/sale/pages/QuotationsListPage';
import { WarehousesPage } from '../features/warehouses/pages/WarehousesPage';
import { VehiclesPage } from '../features/vehicles/pages/VehiclesPage';
import { RoutesPage } from '../features/routes/pages/RoutesPage';
import { CategoriesPage } from '../features/catalog/pages/CategoriesPage';
import { BrandsPage } from '../features/catalog/pages/BrandsPage';
import { ProductsPage } from '../features/catalog/pages/ProductsPage';
import { IntakePage } from '../features/inventory/pages/IntakePage';
import { IntakeDetailPage } from '../features/inventory/pages/IntakeDetailPage';
import { BulkBarcodePrintPage } from '../features/inventory/pages/BulkBarcodePrintPage';
import { TransfersPage } from '../features/inventory/pages/TransfersPage';
import { CreateTransferPage } from '../features/inventory/pages/CreateTransferPage';
import { TransferDetailsPage } from '../features/inventory/pages/TransferDetailsPage';
import { SuppliersPage } from '../features/suppliers/pages/SuppliersPage';
import { SupplierDetailsPage } from '../features/suppliers/pages/SupplierDetailsPage';
import { DiscrepanciesPage } from '../features/operations/pages/DiscrepanciesPage';
import { CreateBookingPage } from '../features/operations/pages/CreateBookingPage';
import { PreOrderFulfillmentPage } from '../features/operations/pages/PreOrderFulfillmentPage';
import { FixedAssetsPage } from '../features/assets/pages/FixedAssetsPage';
import ExpensesPage from '../features/expenses/pages/ExpensesPage';
import { ReturnsPage } from '../features/service/pages/ReturnsPage';
import { WarrantyClaimsPage } from '../features/service/pages/WarrantyClaimsPage';
import { SalesPage } from '../features/sale/pages/SalesPage';
import { SaleDetailsPage } from '../features/sale/pages/SaleDetailsPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { StockReportPage } from '../features/reports/pages/StockReportPage';
import { SalesReportPage } from '../features/reports/pages/SalesReportPage';
import { ProfitLossReportPage } from '../features/reports/pages/ProfitLossReportPage';

import { SyncConflictsPage } from '../features/sync/pages/SyncConflictsPage';
import { ContractsReportPage } from '../features/reports/pages/ContractsReportPage';
import { SchedulesReportPage } from '../features/reports/pages/SchedulesReportPage';
import { ReceiptsReportPage } from '../features/reports/pages/ReceiptsReportPage';
import { CollectionEfficiencyReportPage } from '../features/reports/pages/CollectionEfficiencyReportPage';
import { ExpenseReportPage } from '../features/reports/pages/ExpenseReportPage';
import { TaxReportPage } from '../features/reports/pages/TaxReportPage';
import { ProductPerformanceReportPage } from '../features/reports/pages/ProductPerformanceReportPage';
import { BookingsReportPage } from '../features/reports/pages/BookingsReportPage';
import { PayrollReportPage } from '../features/reports/pages/PayrollReportPage';
import { SerialLifecycleReportPage } from '../features/reports/pages/SerialLifecycleReportPage';
import { SMSLogsPage } from '../features/communications/pages/SMSLogsPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { ProfilePage } from '../features/users/pages/ProfilePage';

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: '/',
            element: <DashboardPage />,
          },
          {
            path: '/branches',
            element: <BranchesPage />,
          },
          {
            path: '/profile',
            element: <ProfilePage />,
          },
          {
            path: '/users',
            element: <UsersPage />,
          },
          {
            path: '/wallets',
            element: <WalletsList />,
          },
          {
            path: '/wallets/:id',
            element: <WalletDetails />,
          },
          {
            path: '/rbac',
            element: <RbacPage />,
          },
          {
            path: '/warehouses',
            element: <WarehousesPage />,
          },
          {
            path: '/logistics/vehicles',
            element: <VehiclesPage />,
          },
          {
            path: '/logistics/routes',
            element: <RoutesPage />,
          },
          {
            path: '/categories',
            element: <CategoriesPage />,
          },
          {
            path: '/brands',
            element: <BrandsPage />,
          },
          {
            path: '/products',
            element: <ProductsPage />,
          },
          {
            path: '/customers',
            element: <CustomersPage />,
          },
          {
            path: '/customers/:id',
            element: <CustomerDetailsPage />,
          },
          {
            path: '/collections',
            element: <CollectionsDashboardPage />,
          },

          {
            path: '/schemes',
            element: <SchemesPage />,
          },
          {
            path: '/trips',
            element: <TripsPage />,
          },
          {
            path: '/trips/:id',
            element: <TripDetailsPage />,
          },
          {
            path: '/operations/bookings',
            element: <BookingsPage />,
          },
          {
            path: '/promotions',
            element: <PromotionsPage />,
          },
          {
            path: '/trips/:id/load',
            element: <LoadTripStockPage />,
          },
          {
            path: '/trips/:id/reconcile',
            element: <TripReconciliationPage />,
          },
          {
            path: '/discrepancies',
            element: <DiscrepanciesPage />,
          },
          {
            path: '/bookings',
            element: <BookingsPage />,
          },
          {
            path: '/bookings/new',
            element: <CreateBookingPage />,
          },
          {
            path: '/bookings/:id/checkout',
            element: <PreOrderFulfillmentPage />,
          },
          {
            path: '/sync-conflicts',
            element: <SyncConflictsPage />,
          },
          {
            path: '/returns',
            element: <ReturnsPage />,
          },
          {
            path: '/warranty',
            element: <WarrantyClaimsPage />,
          },
          {
            path: '/sales',
            element: <SalesPage />,
          },
          {
            path: '/sales/:id',
            element: <SaleDetailsPage />,
          },
          {
            path: '/pos',
            element: <POS2Page />,
          },
          {
            path: '/quotations',
            element: <QuotationsListPage />,
          },
          {
            path: 'quotations/new',
            element: <QuotationsPage />
          },
          {
            path: 'assets',
            element: <FixedAssetsPage />
          },
          {
            path: '/intake',
            element: <IntakePage />,
          },
          {
            path: '/intake/:id',
            element: <IntakeDetailPage />,
          },
          {
            path: '/inventory/print-barcodes',
            element: <BulkBarcodePrintPage />,
          },
          {
            path: '/inventory/transfers',
            element: <TransfersPage />,
          },
          {
            path: '/inventory/transfers/new',
            element: <CreateTransferPage />,
          },
          {
            path: '/inventory/transfers/:id',
            element: <TransferDetailsPage />,
          },
          {
            path: '/suppliers',
            element: <SuppliersPage />,
          },
          {
            path: '/suppliers/:id',
            element: <SupplierDetailsPage />,
          },
          {
            path: '/settings',
            element: <SettingsPage />,
          },
          {
            path: '/communications/sms-logs',
            element: <SMSLogsPage />,
          },
          {
            path: '/reports/stock',
            element: <StockReportPage />,
          },
          {
            path: '/reports/sales',
            element: <SalesReportPage />,
          },
          {
            path: '/reports/profit-loss',
            element: <ProfitLossReportPage />,
          },
          {
            path: '/reports/contracts',
            element: <ContractsReportPage />,
          },
          {
            path: '/reports/schedules',
            element: <SchedulesReportPage />,
          },
          {
            path: '/reports/receipts',
            element: <ReceiptsReportPage />,
          },
          {
            path: '/reports/efficiency',
            element: <CollectionEfficiencyReportPage />,
          },
          {
            path: '/reports/expenses',
            element: <ExpenseReportPage />,
          },
          {
            path: '/reports/tax',
            element: <TaxReportPage />,
          },
          {
            path: '/reports/product-performance',
            element: <ProductPerformanceReportPage />,
          },
          {
            path: '/reports/bookings',
            element: <BookingsReportPage />,
          },
          {
            path: '/reports/payroll',
            element: <PayrollReportPage />,
          },
          {
            path: '/reports/serials',
            element: <SerialLifecycleReportPage />,
          },
          {
            path: '/promotions',
            element: <PromotionsPage />,
          },
          {
            path: '/expenses',
            element: <ExpensesPage />,
          },
          {
            path: '*',
            element: <div style={{ padding: 'var(--spacing-4)', color: 'var(--status-error)' }}><h2>404 Not Found</h2><p>The page you are looking for does not exist.</p></div>,
          }
        ],
      }
    ]
  },
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          }
        ]
      }
    ]
  }
], {
  basename: '/'
});

export function AppRouter() {
  return <RouterProvider router={router} />;


}
