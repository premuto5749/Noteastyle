import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const MODEL = "codeplugtech/face-swap" as const;

/**
 * Start a face swap prediction on Replicate.
 * Returns { _id, status, url } matching the FaceSwapJob interface.
 */
export async function faceSwap(sourceImageUrl: string, targetImageUrl: string) {
  const prediction = await replicate.predictions.create({
    model: MODEL,
    input: {
      swap_image: sourceImageUrl,
      input_image: targetImageUrl,
    },
  });

  return {
    _id: prediction.id,
    status: mapStatus(prediction.status),
    url: typeof prediction.output === "string" ? prediction.output : undefined,
  };
}

/**
 * Poll the status of a face swap prediction.
 * Returns { _id, status, url } matching the FaceSwapJob interface.
 */
export async function getFaceSwapStatus(jobId: string) {
  const prediction = await replicate.predictions.get(jobId);

  return {
    _id: prediction.id,
    status: mapStatus(prediction.status),
    url: typeof prediction.output === "string" ? prediction.output : undefined,
  };
}

/**
 * Map Replicate prediction status to the numeric status used by FaceSwapJob:
 *   1 = processing, 2 = succeeded, 3 = failed
 */
function mapStatus(status: string): number {
  switch (status) {
    case "starting":
    case "processing":
      return 1;
    case "succeeded":
      return 2;
    case "failed":
    case "canceled":
      return 3;
    default:
      return 1;
  }
}
