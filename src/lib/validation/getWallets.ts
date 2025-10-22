import { z } from "zod";

/**
 * Validation schema for GET /api/wallets query parameters
 */
export const GetWalletsQuerySchema = z.object({
  sortBy: z.enum(["name", "target_date"], {
    errorMap: () => ({ message: "sortBy must be one of: name, target_date" })
  }).default("target_date"),
  order: z.enum(["asc", "desc"], {
    errorMap: () => ({ message: "order must be one of: asc, desc" })
  }).default("asc")
});

export type GetWalletsQueryParams = z.infer<typeof GetWalletsQuerySchema>;
