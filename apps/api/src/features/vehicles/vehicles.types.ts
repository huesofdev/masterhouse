import { z } from "zod";

const vehicleTypeEnum = z.enum(["LORRY", "VAN", "CAR", "TUK_TUK", "BIKE", "OTHER"]);
const vehicleStatusEnum = z.enum(["ACTIVE", "IN_SERVICE", "RETIRED"]);

export const createVehicleSchema = z.object({
  type: vehicleTypeEnum.default("LORRY"),
  license_plate: z.string().min(2, "License plate is required").max(50),
  model: z.string().min(1, "Model is required").max(100),
  status: vehicleStatusEnum.default("ACTIVE"),
});

export type CreateVehiclePayload = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z.object({
  type: vehicleTypeEnum.optional(),
  license_plate: z.string().min(2).max(50).optional(),
  model: z.string().min(1).max(100).optional(),
  status: vehicleStatusEnum.optional(),
});

export type UpdateVehiclePayload = z.infer<typeof updateVehicleSchema>;
