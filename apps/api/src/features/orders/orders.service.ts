import { db } from "../../db";
import { preOrdersTable, preOrderItemsTable } from "./orders.schema";
import { customersTable } from "../customers/customers.schema";
import { productsTable } from "../products/products.schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { CreatePreOrderPayload } from "./orders.types";

export class OrdersService {
  static async createPreOrder(payload: CreatePreOrderPayload, branchId: string, userId: string) {
    const id = payload.id || uuidv7();

    // 0. Idempotency Check
    const existing = await db.select({ id: preOrdersTable.id }).from(preOrdersTable).where(eq(preOrdersTable.id, id)).limit(1);
    if (existing.length > 0) return id;

    const customer = await db.select().from(customersTable).where(eq(customersTable.id, payload.customer_id)).limit(1);
    if (!customer.length) throw new Error("Customer not found");
    if (!customer[0].route_id) throw new Error("Customer must be assigned to a route before making a booking");

    await db.transaction(async (tx) => {
      const { getNextSequence } = await import("../../lib/sequence-generator");
      const referenceNumber = await getNextSequence(tx, branchId, "BOOKING", { routeId: customer[0].route_id! });

      await tx.insert(preOrdersTable).values({
        id,
        reference_number: referenceNumber,
        offline_receipt_number: payload.offline_receipt_number || null,
        branch_id: branchId,
        route_id: customer[0].route_id!,
        trip_id: payload.trip_id || null,
        customer_id: payload.customer_id,
        advance_payment: payload.advance_payment?.toString() || "0.00",
        payment_method: payload.payment_method || null,
        sale_type_preference: payload.sale_type_preference || null,
        receipt_number: payload.receipt_number || null,
        remarks: payload.remarks || null,
        created_by: userId,
        status: "PENDING",
      });

      const itemsToInsert = payload.items.map(item => ({
        id: uuidv7(),
        pre_order_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        discount_input: item.discount_input || null,
      }));

      await tx.insert(preOrderItemsTable).values(itemsToInsert);
    });

    return id;
  }

  static async listPreOrders(branchId: string, routeId?: string, status?: string) {
    let baseQuery = db
      .select({
        id: preOrdersTable.id,
        customer_id: preOrdersTable.customer_id,
        status: preOrdersTable.status,
        advance_payment: preOrdersTable.advance_payment,
        payment_method: preOrdersTable.payment_method,
        sale_type_preference: preOrdersTable.sale_type_preference,
        receipt_number: preOrdersTable.receipt_number,
        offline_receipt_number: preOrdersTable.offline_receipt_number,
        reference_number: preOrdersTable.reference_number,
        remarks: preOrdersTable.remarks,
        created_at: preOrdersTable.created_at,
        customer_name: customersTable.full_name,
        customer_phone: customersTable.mobile,
        customer_address: customersTable.address,
      })
      .from(preOrdersTable)
      .leftJoin(customersTable, eq(preOrdersTable.customer_id, customersTable.id))
      .where(routeId ? and(eq(preOrdersTable.branch_id, branchId), eq(preOrdersTable.route_id, routeId)) : eq(preOrdersTable.branch_id, branchId));

    const results = await baseQuery.orderBy(desc(preOrdersTable.created_at));
    
    let filteredResults = results;
    if (status) {
      filteredResults = results.filter(r => r.status === status);
    }
    
    if (filteredResults.length === 0) return [];

    // Fetch items for the retrieved bookings
    const orderIds = filteredResults.map(r => r.id);
    const items = await db.select({
      pre_order_id: preOrderItemsTable.pre_order_id,
      product_id: preOrderItemsTable.product_id,
      quantity: preOrderItemsTable.quantity,
      product_name: productsTable.name,
    })
    .from(preOrderItemsTable)
    .leftJoin(productsTable, eq(preOrderItemsTable.product_id, productsTable.id))
    .where(inArray(preOrderItemsTable.pre_order_id, orderIds));

    return filteredResults.map(order => {
      const orderItems = items.filter(i => i.pre_order_id === order.id);
      return {
        ...order,
        items: orderItems,
      };
    });
  }

  static async deletePreOrder(id: string, branchId: string) {
    const existing = await db.select().from(preOrdersTable).where(and(eq(preOrdersTable.id, id), eq(preOrdersTable.branch_id, branchId))).limit(1);
    if (existing.length === 0) {
      throw new Error("Order not found or unauthorized");
    }
    if (existing[0].status === "FULFILLED") {
      throw new Error("Cannot delete a fulfilled order");
    }
    await db.transaction(async (tx) => {
      await tx.delete(preOrderItemsTable).where(eq(preOrderItemsTable.pre_order_id, id));
      await tx.delete(preOrdersTable).where(eq(preOrdersTable.id, id));
    });
  }
}
