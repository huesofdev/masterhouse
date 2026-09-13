import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { routesTable, routeAreasTable } from "./routes.schema";
import { CreateRoutePayload, UpdateRoutePayload } from "./routes.types";

export class RoutesService {
  static async createRoute(branchId: string, payload: CreateRoutePayload) {
    const id = uuidv7();
    const { areas, ...routeData } = payload;

    await db.transaction(async (tx) => {
      await tx.insert(routesTable).values({
        id,
        branch_id: branchId,
        code: routeData.code,
        name: routeData.name,
        description: routeData.description || null,
        is_active: routeData.is_active,
      });

      if (areas && areas.length > 0) {
        await tx.insert(routeAreasTable).values(
          areas.map((a) => ({
            id: a.id || uuidv7(),
            route_id: id,
            name: a.name,
          }))
        );
      }
    });

    return this.getRoute(id);
  }

  static async getRoute(id: string) {
    const result = await db.query.routesTable.findFirst({
      where: eq(routesTable.id, id),
      with: { areas: true },
    });
    return result || null;
  }

  static async listRoutes(branchId: string) {
    return db.query.routesTable.findMany({
      where: eq(routesTable.branch_id, branchId),
      with: { areas: true },
      orderBy: (routes, { desc }) => [desc(routes.created_at)],
    });
  }

  static async updateRoute(id: string, payload: UpdateRoutePayload) {
    const { areas, ...routeData } = payload;

    await db.transaction(async (tx) => {
      if (Object.keys(routeData).length > 0) {
        await tx.update(routesTable).set({
          ...routeData,
          description: routeData.description || null,
        }).where(eq(routesTable.id, id));
      }

      if (areas !== undefined) {
        // Fetch existing areas
        const existingAreas = await tx.select().from(routeAreasTable).where(eq(routeAreasTable.route_id, id));
        const existingIds = existingAreas.map(a => a.id);

        const inputIds = areas.map(a => a.id).filter((id): id is string => !!id);

        // Delete areas not present in input
        const toDelete = existingIds.filter(id => !inputIds.includes(id));
        if (toDelete.length > 0) {
          await tx.delete(routeAreasTable).where(inArray(routeAreasTable.id, toDelete));
        }

        // Insert new areas & update existing
        for (const area of areas) {
          if (area.id && existingIds.includes(area.id)) {
            // Update
            await tx.update(routeAreasTable)
              .set({ name: area.name })
              .where(eq(routeAreasTable.id, area.id));
          } else {
            // Insert
            await tx.insert(routeAreasTable).values({
              id: area.id || uuidv7(),
              route_id: id,
              name: area.name
            });
          }
        }
      }
    });

    return this.getRoute(id);
  }

  static async deleteRoute(id: string) {
    const result = await db.delete(routesTable).where(eq(routesTable.id, id));
    return result[0].affectedRows > 0;
  }
}
