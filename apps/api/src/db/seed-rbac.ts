import { db } from "./index";
import { v7 as uuidv7 } from "uuid";
import { scryptSync, randomBytes } from "node:crypto";
import { rolesTable, permissionsTable, rolePermissionsTable } from "../features/rbac/rbac.schema";
import { usersTable } from "../features/user/user.schema";
import { branchesTable, branchPhonesTable } from "../features/branches/branches.schema";
import * as dotenv from 'dotenv';
import { eq } from "drizzle-orm";

dotenv.config();

const PERMISSION_MODULES: Record<string, string[]> = {
  users: ['users:read', 'users:create', 'users:update', 'users:delete'],
  roles: ['roles:read', 'roles:create', 'roles:update', 'roles:delete'],
  branches: ['branches:read', 'branches:create', 'branches:update', 'branches:delete'],
  customers: ['customers:read', 'customers:create', 'customers:update', 'customers:delete'],
  catalog: ['catalog:read', 'catalog:create', 'catalog:update', 'catalog:delete'],
  inventory: ['inventory:read', 'inventory:adjust', 'inventory:transfer', 'inventory:delete'],
  warehouses: ['warehouses:read', 'warehouses:create', 'warehouses:update'],
  suppliers: ['suppliers:read', 'suppliers:create', 'suppliers:update'],
  trips: ['trips:read', 'trips:create', 'trips:update', 'trips:delete', 'trips:reconcile', 'trips:force_end'],
  logistics: ['logistics:read', 'logistics:create', 'logistics:update'],
  sales: ['sales:read', 'sales:create', 'sales:update', 'sales:view_cost'],
  collections: ['collections:read', 'collections:create', 'collections:update', 'collections:adjust'],
  promotions: ['promotions:read', 'promotions:create', 'promotions:update', 'promotions:delete'],
  service: ['service:read', 'service:process'],
  reports: ['reports:view', 'reports:export'],
  settings: ['settings:read', 'settings:update'],
  sync: ['sync:manage'],
  orders: ['orders:read', 'orders:create', 'orders:delete'],
  assets: ['assets:read', 'assets:create', 'assets:update', 'assets:delete'],
  expenses: ['expenses:read', 'expenses:create', 'expenses:update'],
  wallets: ['wallets:read', 'wallets:update'],
};

async function seedRbac() {
  console.log("Starting RBAC Seed...");

  try {
    // 1. Create permissions
    console.log("Seeding permissions...");
    const permIds: string[] = [];
    
    // Flatten permissions list
    const allPerms = Object.values(PERMISSION_MODULES).flat();

    for (const perm of allPerms) {
      const existing = await db.select().from(permissionsTable).where(eq(permissionsTable.name, perm)).limit(1);
      if (existing.length > 0) {
        permIds.push(existing[0].id);
      } else {
        const pId = uuidv7();
        const [module, action] = perm.split(':');
        await db.insert(permissionsTable).values({
          id: pId,
          name: perm,
          description: `Allows ${action} operations on ${module}`,
        });
        permIds.push(pId);
      }
    }

    // 2. Create Default Roles
    console.log("Seeding Roles (Super Admin, Owner, Sales Rep, Front Desk)...");

    const defaultRoles = [
      {
        name: "Super Admin",
        description: "Full system access including destructive actions.",
        level: 100,
        perms: allPerms // All permissions
      },
      {
        name: "Owner",
        description: "Business owner with full access to reporting and operations.",
        level: 90,
        perms: allPerms // All permissions
      },
      {
        name: "Sales Rep",
        description: "Handles customer acquisition and sales creation.",
        level: 50,
        perms: [
          'customers:read', 'customers:create', 'customers:update',
          'catalog:read', 'inventory:read',
          'sales:read', 'sales:create', 'sales:update',
          'collections:read',
          'orders:read', 'orders:create'
        ]
      },
      {
        name: "Front Desk",
        description: "Handles walk-ins, payments, and basic service operations.",
        level: 30,
        perms: [
          'customers:read', 'customers:create',
          'catalog:read', 'sales:read',
          'collections:read', 'collections:create', 'collections:update',
          'service:read', 'service:process',
          'orders:read', 'orders:create',
          'expenses:read', 'expenses:create'
        ]
      }
    ];

    let superAdminRoleId = "";

    for (const roleDef of defaultRoles) {
      let roleId = "";
      const existingRole = await db.select().from(rolesTable).where(eq(rolesTable.name, roleDef.name)).limit(1);
      
      if (existingRole.length > 0) {
        roleId = existingRole[0].id;
      } else {
        roleId = uuidv7();
        await db.insert(rolesTable).values({
          id: roleId,
          name: roleDef.name,
          description: roleDef.description,
          level: roleDef.level,
        });

        // Link permissions to role
        for (const pName of roleDef.perms) {
          const permRec = await db.select().from(permissionsTable).where(eq(permissionsTable.name, pName)).limit(1);
          if (permRec.length > 0) {
            await db.insert(rolePermissionsTable).values({
              role_id: roleId,
              permission_id: permRec[0].id,
            });
          }
        }
      }

      if (roleDef.name === "Super Admin") {
        superAdminRoleId = roleId;
      }
    }
    // 4. Create dummy branch for user
    let branchId = "";
    const existingBranch = await db.select().from(branchesTable).where(eq(branchesTable.name, "HQ (Admin Only)")).limit(1);
    
    if (existingBranch.length > 0) {
      branchId = existingBranch[0].id;
    } else {
      branchId = uuidv7();
      await db.insert(branchesTable).values({
        id: branchId,
        name: "HQ (Admin Only)",
        code: "HQ-01",
        address: "123 Admin Lane",
        is_active: true,
      } as any);
    }

    // 5. Create Admin User
    console.log("Seeding Admin user...");
    let adminId = "";
    const existingAdmin = await db.select().from(usersTable).where(eq(usersTable.email, "admin@masterhouse.lk")).limit(1);
    
    if (existingAdmin.length > 0) {
      adminId = existingAdmin[0].id;
    } else {
      adminId = uuidv7();
      const salt = randomBytes(16).toString("hex");
      const derivedKey = scryptSync("password123", salt, 64).toString("hex");
      const hash = `${salt}:${derivedKey}`;

      await db.insert(usersTable).values({
        id: adminId,
        email: "admin@masterhouse.lk",
        password_hash: hash,
        name: "System Admin",
        role_id: superAdminRoleId,
        is_active: true,
      });
      
      const { userBranchesTable } = require("../features/user/user.schema");
      await db.insert(userBranchesTable).values({
        user_id: adminId,
        branch_id: branchId,
      });
    }

    // 6. Seed Default System Settings & SMS Templates
    console.log("Seeding Default Settings & SMS Templates...");
    const { systemSettingsTable } = require("../features/settings/settings.schema");
    const { smsTemplatesTable } = require("../features/notifications/notifications.schema");
    
    // System Configs
    const defaultSettings = [
      { setting_key: "company_name", setting_value: "Master House" },
      { setting_key: "enable_overdue_penalties", setting_value: "true" },
      { setting_key: "sms_reminder_days", setting_value: "2" }
    ];

    for (const setting of defaultSettings) {
      const existingSetting = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.setting_key, setting.setting_key)).limit(1);
      if (existingSetting.length === 0) {
        await db.insert(systemSettingsTable).values({
          setting_key: setting.setting_key,
          setting_value: setting.setting_value,
          updated_by: adminId,
        });
      }
    }

    // SMS Templates
    const defaultTemplates = [
      { trigger_event: "SALE_CREATED" as const, body_template: "Dear {{name}}, thank you for purchasing {{product_name}}! We've received your downpayment of Rs.{{downpayment}}. {{upcoming_dues_message}} Thank you for choosing {{company_name}}!" },
      { trigger_event: "COLLECTION_RECEIPT" as const, body_template: "Dear {{name}}, we have received your payment of Rs.{{paid_amount}}. Your remaining balance is Rs.{{balance}}. - {{company_name}} ({{branch_phone}})" },
      { trigger_event: "PAYMENT_OVERDUE" as const, body_template: "Dear {{name}}, your payment of Rs.{{missed_amount}} due on {{due_date}} is overdue. A penalty of Rs.{{penalty_added}} has been added. Pending total: Rs.{{total_pending}}. Call {{branch_phone}}. - {{company_name}}" },
      { trigger_event: "DIRECT_SALE_CREATED" as const, body_template: "Dear {{name}}, thank you for your direct purchase of {{product_name}}. We have received your payment of Rs.{{paid_amount}}. Thank you for choosing {{company_name}}!" },
      { trigger_event: "PAYMENT_REMINDER" as const, body_template: "Dear {{name}}, this is a friendly reminder from {{company_name}} that your installment of Rs.{{amount_due}} is due on {{due_date}}. Please ensure payment to avoid late fees. Call {{branch_phone}}." }
    ];

    for (const tpl of defaultTemplates) {
      const existingTpl = await db.select().from(smsTemplatesTable).where(eq(smsTemplatesTable.trigger_event, tpl.trigger_event)).limit(1);
      if (existingTpl.length === 0) {
        await db.insert(smsTemplatesTable).values({
          id: uuidv7(),
          trigger_event: tpl.trigger_event,
          body_template: tpl.body_template,
          is_active: true,
        });
      }
    }

    console.log("✅ RBAC & Settings Seed complete! Admin login: admin@masterhouse.lk / password123");
    process.exit(0);
  } catch (error) {
    console.error("❌ RBAC Seed failed:", error);
    process.exit(1);
  }
}

seedRbac();
