const AKOOL_BASE_URL = "https://openapi.akool.com/api/open/v3";

async function getAkoolToken(): Promise<string> {
  const resp = await fetch(`${AKOOL_BASE_URL}/getToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: process.env.AKOOL_CLIENT_ID,
      clientSecret: process.env.AKOOL_API_KEY,
    }),
  });
  if (!resp.ok) throw new Error("Failed to get AKOOL token");
  const data = await resp.json();
  return data.token;
}

export async function faceSwap(sourceImageUrl: string, targetImageUrl: string) {
  const token = await getAkoolToken();
  const resp = await fetch(`${AKOOL_BASE_URL}/faceswap/highquality/specifyimage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sourceImage: [{ path: sourceImageUrl, opts: "face1" }],
      targetImage: [{ path: targetImageUrl, opts: "face1" }],
      face_enhance: 1,
      modifyImage: targetImageUrl,
    }),
  });
  if (!resp.ok) throw new Error("Face swap request failed");
  return resp.json();
}

export async function getFaceSwapStatus(jobId: string) {
  const token = await getAkoolToken();
  const resp = await fetch(
    `${AKOOL_BASE_URL}/faceswap/highquality/infobymodelid?_id=${jobId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) throw new Error("Failed to get face swap status");
  return resp.json();
}
