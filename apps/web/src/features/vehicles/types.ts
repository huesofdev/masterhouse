import { z } from 'zod';

export const vehicleTypeEnum = z.enum(["LORRY", "VAN", "CAR", "TUK_TUK", "BIKE", "OTHER"]);
export const vehicleStatusEnum = z.enum(["ACTIVE", "IN_SERVICE", "RETIRED"]);

export interface Vehicle {
  id: string;
  branch_id: string;
  type: z.infer<typeof vehicleTypeEnum>;
  license_plate: string;
  model: string;
  status: z.infer<typeof vehicleStatusEnum>;
  created_at: string;
}

export const vehicleSchema = z.object({
  type: vehicleTypeEnum.default("LORRY"),
  license_plate: z.string().min(2, "License plate is required").max(50),
  model: z.string().min(1, "Model is required").max(100),
  status: vehicleStatusEnum.default("ACTIVE"),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
