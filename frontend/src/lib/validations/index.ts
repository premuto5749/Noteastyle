import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Parse and validate request body against a Zod schema.
 * Returns parsed data on success, or a 400 error Response on failure.
 */
export async function validateBody<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<{ data: z.infer<T> } | { error: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "잘못된 요청 형식입니다.", details: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        {
          error: "입력 데이터가 유효하지 않습니다.",
          details: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}

export { treatmentCreateSchema } from "./treatment";
export { customerCreateSchema } from "./customer";
export { reservationCreateSchema } from "./reservation";
