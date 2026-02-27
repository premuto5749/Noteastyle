import { z } from "zod";

export const reservationCreateSchema = z.object({
  customer_id: z.string().uuid("유효한 고객 ID가 필요합니다."),
  member_id: z.string().uuid().nullable().optional(),
  scheduled_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD입니다."),
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "시간 형식은 HH:MM 또는 HH:MM:SS입니다."),
  estimated_duration_minutes: z.number().int().positive().optional().default(60),
  service_type: z.string().nullable().optional(),
  service_detail: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  source: z.string().optional().default("manual"),
});
