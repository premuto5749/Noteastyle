import { z } from "zod";

export const treatmentCreateSchema = z.object({
  customer_id: z.string().uuid("유효한 고객 ID가 필요합니다."),
  member_id: z.string().uuid().nullable().optional(),
  service_type: z.string().min(1, "시술 종류를 입력해주세요."),
  service_detail: z.string().nullable().optional(),
  products_used: z
    .array(
      z.object({
        brand: z.string().min(1),
        code: z.string().nullable().optional(),
        area: z.string().nullable().optional(),
      })
    )
    .nullable()
    .optional(),
  area: z.string().nullable().optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  satisfaction: z.enum(["high", "medium", "low"]).nullable().optional(),
  customer_notes: z.string().nullable().optional(),
  next_visit_recommendation: z.string().nullable().optional(),
});
