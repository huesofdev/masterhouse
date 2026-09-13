import { eq, and, sql, like, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { suppliersTable } from "./suppliers.schema";
import { supplierBranchBalancesTable, supplierLedgerTable } from "./supplier_ledger.schema";
import { intakeOrdersTable } from "../inventory/intake.schema";
import { CreateSupplierPayload, UpdateSupplierPayload, RecordPaymentPayload } from "./suppliers.types";

export class SuppliersService {
  static async createSupplier(payload: CreateSupplierPayload, branchId: string, userId: string) {
    return await db.transaction(async (tx) => {
      const id = uuidv7();
      await tx.insert(suppliersTable).values({
        id,
        name: payload.name,
        contact_person: payload.contact_person || null,
        phone: payload.phone || null,
        email: payload.email || null,
        address: payload.address || null,
        notes: payload.notes || null,
        is_active: payload.is_active ?? true,
      });

      // Initialize branch balance if opening balance > 0
      if (payload.opening_balance && payload.opening_balance > 0) {
        await tx.insert(supplierBranchBalancesTable).values({
          id: uuidv7(),
          supplier_id: id,
          branch_id: branchId,
          opening_balance: payload.opening_balance.toString(),
          balance_due: payload.opening_balance.toString(),
        });

        await tx.insert(supplierLedgerTable).values({
          id: uuidv7(),
          supplier_id: id,
          branch_id: branchId,
          transaction_type: "OPENING_BALANCE",
          amount: payload.opening_balance.toString(),
          balance_after: payload.opening_balance.toString(),
          notes: "Initial balance set on creation",
          created_by: userId,
        });
      }

      return this.getSupplier(id, branchId);
    });
  }

  static async getSupplier(id: string, branchId?: string) {
    const supplier = await db.query.suppliersTable.findFirst({
      where: eq(suppliersTable.id, id),
    });

    if (!supplier) return null;

    if (branchId) {
      const balance = await db.query.supplierBranchBalancesTable.findFirst({
        where: and(
          eq(supplierBranchBalancesTable.supplier_id, id),
          eq(supplierBranchBalancesTable.branch_id, branchId)
        )
      });
      return {
        ...supplier,
        balance_due: balance?.balance_due || "0.00",
        total_paid: balance?.total_paid || "0.00",
        opening_balance: balance?.opening_balance || "0.00"
      };
    }
    return supplier;
  }

  static async listSuppliers(branchId: string, page: number = 1, limit: number = 30, search: string = '') {
    const offset = (page - 1) * limit;
    const whereClause = search ? like(suppliersTable.name, `%${search}%`) : undefined;

    const suppliersData = await db.query.suppliersTable.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (s, { asc }) => [asc(s.name)],
    });

    // Fetch balances for this branch
    const supplierIds = suppliersData.map(s => s.id);
    let balancesMap = new Map();

    if (supplierIds.length > 0) {
      const balances = await db.query.supplierBranchBalancesTable.findMany({
        where: and(
          eq(supplierBranchBalancesTable.branch_id, branchId),
          inArray(supplierBranchBalancesTable.supplier_id, supplierIds)
        )
      });
      balances.forEach(b => balancesMap.set(b.supplier_id, b));
    }

    const data = suppliersData.map(s => {
      const b = balancesMap.get(s.id);
      return {
        ...s,
        balance_due: b?.balance_due || "0.00",
        total_paid: b?.total_paid || "0.00"
      };
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(suppliersTable)
      .where(whereClause);

    return {
      data,
      meta: {
        total_records: Number(count),
        total_pages: Math.ceil(Number(count) / limit),
        current_page: page,
        page_size: limit,
      },
    };
  }

  static async updateSupplier(id: string, payload: UpdateSupplierPayload, branchId: string) {
    // Only updates base info.
    const { opening_balance, ...basePayload } = payload as any;
    if (Object.keys(basePayload).length > 0) {
      await db.update(suppliersTable).set(basePayload).where(eq(suppliersTable.id, id));
    }
    return this.getSupplier(id, branchId);
  }

  static async deleteSupplier(id: string) {
    const result = await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
    return (result[0] as any).affectedRows > 0;
  }

  static async recordPayment(supplierId: string, branchId: string, payload: RecordPaymentPayload, userId: string) {
    return await db.transaction(async (tx) => {
      // Get current balance
      let balanceRow = await tx.query.supplierBranchBalancesTable.findFirst({
        where: and(
          eq(supplierBranchBalancesTable.supplier_id, supplierId),
          eq(supplierBranchBalancesTable.branch_id, branchId)
        )
      });

      if (!balanceRow) {
        // Create an empty balance row if it doesn't exist
        const id = uuidv7();
        await tx.insert(supplierBranchBalancesTable).values({
          id,
          supplier_id: supplierId,
          branch_id: branchId,
          balance_due: "0.00",
          total_paid: "0.00",
          opening_balance: "0.00"
        });
        balanceRow = { id, supplier_id: supplierId, branch_id: branchId, balance_due: "0.00", total_paid: "0.00", opening_balance: "0.00" } as any;
      }

      const currentBalance = parseFloat(balanceRow!.balance_due as string);
      const currentPaid = parseFloat(balanceRow!.total_paid as string);
      
      const newBalance = currentBalance - payload.amount;
      const newPaid = currentPaid + payload.amount;

      // Update balances
      await tx.update(supplierBranchBalancesTable)
        .set({
          balance_due: newBalance.toString(),
          total_paid: newPaid.toString(),
          updated_at: new Date()
        })
        .where(eq(supplierBranchBalancesTable.id, balanceRow!.id));

      // Insert Ledger
      await tx.insert(supplierLedgerTable).values({
        id: uuidv7(),
        supplier_id: supplierId,
        branch_id: branchId,
        transaction_type: "PAYMENT",
        amount: (-payload.amount).toString(), // negative for payment
        balance_after: newBalance.toString(),
        notes: payload.notes || "Payment made",
        created_by: userId,
      });

      return {
        balance_due: newBalance.toString(),
        total_paid: newPaid.toString()
      };
    });
  }

  static async getSupplierLedger(supplierId: string, branchId: string, page: number = 1, limit: number = 30) {
    const offset = (page - 1) * limit;

    const data = await db.query.supplierLedgerTable.findMany({
      where: and(
        eq(supplierLedgerTable.supplier_id, supplierId),
        eq(supplierLedgerTable.branch_id, branchId)
      ),
      limit,
      offset,
      orderBy: (l, { desc }) => [desc(l.created_at)],
      with: {
        creator: { columns: { name: true, email: true } }
      }
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(supplierLedgerTable)
      .where(and(
        eq(supplierLedgerTable.supplier_id, supplierId),
        eq(supplierLedgerTable.branch_id, branchId)
      ));

    return {
      data,
      meta: {
        total_records: Number(count),
        total_pages: Math.ceil(Number(count) / limit),
        current_page: page,
        page_size: limit,
      },
    };
  }

  static async setOpeningBalance(supplierId: string, branchId: string, amount: number, userId: string) {
    return await db.transaction(async (tx) => {
      // Check if balance exists
      let balanceRow = await tx.query.supplierBranchBalancesTable.findFirst({
        where: and(
          eq(supplierBranchBalancesTable.supplier_id, supplierId),
          eq(supplierBranchBalancesTable.branch_id, branchId)
        )
      });

      if (!balanceRow) {
        // Create an empty balance row
        const id = uuidv7();
        await tx.insert(supplierBranchBalancesTable).values({
          id,
          supplier_id: supplierId,
          branch_id: branchId,
          balance_due: amount.toString(),
          total_paid: "0.00",
          opening_balance: amount.toString()
        });
        balanceRow = { id, supplier_id: supplierId, branch_id: branchId, balance_due: amount.toString(), total_paid: "0.00", opening_balance: amount.toString() } as any;
      } else {
        // We already have a balance row. Check if OPENING_BALANCE was already set?
        // Let's just allow overriding it or adding an adjustment. The user specifically wants to "set" the opening balance.
        // We will just increase the balance due by the amount, and insert an OPENING_BALANCE ledger.
        const currentBalance = parseFloat(balanceRow.balance_due as string);
        const newBalance = currentBalance + amount;

        await tx.update(supplierBranchBalancesTable)
          .set({
            balance_due: newBalance.toString(),
            opening_balance: amount.toString(),
            updated_at: new Date()
          })
          .where(eq(supplierBranchBalancesTable.id, balanceRow.id));
        
        balanceRow.balance_due = newBalance.toString();
      }

      // Insert Ledger
      await tx.insert(supplierLedgerTable).values({
        id: uuidv7(),
        supplier_id: supplierId,
        branch_id: branchId,
        transaction_type: "OPENING_BALANCE",
        amount: amount.toString(), 
        balance_after: balanceRow.balance_due as string,
        notes: "Opening balance set manually",
        created_by: userId,
      });

      return {
        balance_due: balanceRow.balance_due,
      };
    });
  }

  static async migrateIntakeSupplierLinks() {
    const suppliers = await db.query.suppliersTable.findMany();
    let linked = 0;
    for (const supplier of suppliers) {
      const result = await db
        .update(intakeOrdersTable)
        .set({ supplier_id: supplier.id })
        .where(eq(intakeOrdersTable.supplier_name, supplier.name));
      linked += (result[0] as any).affectedRows ?? 0;
    }
    return { linked };
  }
}
