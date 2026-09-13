import { eq, and, or, like, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { fleetVehiclesTable } from "./vehicles.schema";
import { CreateVehiclePayload, UpdateVehiclePayload } from "./vehicles.types";

export class VehiclesService {
  static async createVehicle(branchId: string, payload: CreateVehiclePayload) {
    const id = uuidv7();

    await db.insert(fleetVehiclesTable).values({
      id,
      branch_id: branchId,
      type: payload.type,
      license_plate: payload.license_plate,
      model: payload.model,
      status: payload.status,
    });
    return this.getVehicle(id);
  }

  static async getVehicle(id: string) {
    const result = await db.query.fleetVehiclesTable.findFirst({
      where: eq(fleetVehiclesTable.id, id),
    });
    return result || null;
  }

  static async listVehicles(branchId: string, page: number = 1, limit: number = 30, search: string = '') {
    const offset = (page - 1) * limit;
    
    let condition: any = eq(fleetVehiclesTable.branch_id, branchId);
    
    if (search) {
      condition = and(
        condition,
        or(
          like(fleetVehiclesTable.license_plate, `%${search}%`),
          like(fleetVehiclesTable.model, `%${search}%`)
        )
      );
    }

    const data = await db.query.fleetVehiclesTable.findMany({
      where: condition,
      orderBy: (vehicles, { desc }) => [desc(vehicles.created_at)],
      limit,
      offset,
    });

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(fleetVehiclesTable)
      .where(condition);
      
    const count = Number(countResult[0].count);

    return {
      data,
      meta: {
        total_records: count,
        total_pages: Math.ceil(count / limit),
        current_page: page,
        page_size: limit,
      }
    };
  }

  static async updateVehicle(id: string, payload: UpdateVehiclePayload) {
    if (Object.keys(payload).length > 0) {
      await db.update(fleetVehiclesTable).set(payload).where(eq(fleetVehiclesTable.id, id));
    }
    return this.getVehicle(id);
  }

  static async deleteVehicle(id: string) {
    const result = await db.delete(fleetVehiclesTable).where(eq(fleetVehiclesTable.id, id));
    return result[0].affectedRows > 0;
  }
}
