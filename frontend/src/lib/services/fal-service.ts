import { fal } from "@fal-ai/client";

function getFalClient() {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("FAL_KEY 환경변수가 설정되지 않았습니다.");
  }
  fal.config({ credentials: key });
  return fal;
}

interface FaceSwapOutput {
  image: { url: string };
}

/**
 * fal.ai로 페이스 스왑 실행.
 * { _id, status, url } 반환 — FaceSwapJob 인터페이스와 동일.
 */
export async function faceSwap(sourceImageUrl: string, targetImageUrl: string) {
  const client = getFalClient();

  const result = await client.subscribe("half-moon-ai/ai-face-swap/faceswapimage", {
    input: {
      source_face_url: sourceImageUrl,
      target_image_url: targetImageUrl,
    },
    pollInterval: 1000,
  });

  const output = result.data as FaceSwapOutput;
  const url = output?.image?.url ?? undefined;

  return {
    _id: result.requestId,
    status: url ? 2 : 3, // 2 = succeeded, 3 = failed
    url,
  };
}

/**
 * fal.ai 요청 상태 조회.
 * fal.subscribe가 완료까지 기다리므로 generate에서 이미 완료 상태.
 * 이 함수는 queue.result()로 결과를 가져온다.
 */
export async function getFaceSwapStatus(jobId: string) {
  const client = getFalClient();

  const result = await client.queue.result("half-moon-ai/ai-face-swap/faceswapimage", {
    requestId: jobId,
  });

  const output = result.data as FaceSwapOutput;
  const url = output?.image?.url ?? undefined;

  return {
    _id: jobId,
    status: url ? 2 : 3,
    url,
  };
}
