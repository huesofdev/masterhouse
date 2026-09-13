import { z } from "zod";

export const resolveConflictSchema = z.object({
  // The corrected JSON payload submitted by the admin from the UI form
  corrected_payload: z.record(z.any(), "Must be a valid JSON object"),
});

export type ResolveConflictPayload = z.infer<typeof resolveConflictSchema>;

export interface SyncConflictResponse {
  id: string;
  branch_id: string;
  user_id: string;
  error_type: string;
  error_message: string;
  raw_payload: any;
  status: string;
  created_at: Date;
}
