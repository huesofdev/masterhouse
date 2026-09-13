import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'
import { globalErrorHandler } from './middlewares/error.middleware'
import authRoutes from './features/auth/auth.routes'
import userRoutes from './features/user/user.routes'
import rbacRoutes from './features/rbac/rbac.routes'
import branchesRoutes from "./features/branches/branches.routes";
import warehouseRoutes from "./features/warehouses/warehouses.routes";
import catalogRoutes from "./features/catalog/catalog.routes";
import inventoryRoutes from "./features/inventory/inventory.routes";
import vehiclesRoutes from './features/vehicles/vehicles.routes'
import routeRoutes from './features/routes/routes.routes'
import operationsRoutes from './features/operations/operations.routes'
import salesRoutes from './features/sale/sales.routes'
import { quotationsRouter } from './features/sale/quotations.routes'
import syncRoutes from './features/sync/sync.routes'
import collectionsRoutes from './features/collections/collections.routes'
import serviceRoutes from './features/service/service.routes'
import suppliersRoutes from './features/suppliers/suppliers.routes'
import customersRoutes from './features/customers/customers.routes'
import settingsRoutes from './features/settings/settings.routes'
import notificationsRoutes from './features/notifications/notifications.routes'
import reportsRoutes from './features/reports/reports.routes'
import promotionsRoutes from './features/promotions/promotions.routes'
import dashboardRoutes from './features/dashboard/dashboard.routes'
import ordersRoutes from './features/orders/orders.routes'
import expensesRoutes from './features/expenses/expenses.routes'
import { assetsRouter } from './features/assets/assets.routes'

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())
app.use(cookieParser())


// Configure CORS
const allowedOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173',
  'http://164.68.120.42',
  'https://164.68.120.42',
  'https://sys.masterhouse.lk',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: allowedOrigins,
  credentials: true, // Allow cookies to be sent
}))

// Serve static uploads (must be after CORS)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')))

// routes

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/rbac', rbacRoutes)
app.use("/api/branches", branchesRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use('/api/vehicles', vehiclesRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/operations', operationsRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/quotations', quotationsRouter)
app.use('/api/sync', syncRoutes)
app.use('/api/collections', collectionsRoutes)
app.use('/api/service', serviceRoutes)
app.use('/api/suppliers', suppliersRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/promotions', promotionsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/expenses', expensesRoutes)
app.use('/api/assets', assetsRouter)

//global error handler middelware: place it always at the bottom of the code
app.use(globalErrorHandler)

app.listen(PORT as number, '0.0.0.0', () => console.log(`app is running at port ${PORT} on 0.0.0.0`))
