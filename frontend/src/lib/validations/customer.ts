import { z } from "zod";

export const customerCreateSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요.").max(100, "이름은 100자 이내로 입력해주세요."),
  phone: z
    .string()
    .regex(/^[0-9\-+() ]{0,20}$/, "유효한 전화번호 형식이 아닙니다.")
    .nullable()
    .optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식은 YYYY-MM-DD입니다.")
    .nullable()
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
  naver_booking_id: z.string().nullable().optional(),
});
