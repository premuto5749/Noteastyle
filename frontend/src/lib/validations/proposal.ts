import { z } from "zod";

export const createProposalSchema = z.object({
  to_member_id: z.string().uuid(),
  position: z.string().min(1, "포지션을 입력해주세요.").max(50),
  salary_range: z.string().min(1, "급여 범위를 입력해주세요.").max(100),
  benefits: z.string().max(500).optional(),
  shop_intro: z.string().max(1000).optional(),
  message: z.string().max(1000).optional(),
});
