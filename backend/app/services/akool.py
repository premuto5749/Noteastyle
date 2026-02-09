"""AKOOL Face Swap API integration service."""

import httpx

from app.core.config import settings

AKOOL_BASE_URL = "https://openapi.akool.com/api/open/v3"


async def get_akool_token() -> str:
    """Get authentication token from AKOOL API."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AKOOL_BASE_URL}/getToken",
            json={
                "clientId": settings.AKOOL_CLIENT_ID,
                "clientSecret": settings.AKOOL_API_KEY,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["token"]


async def face_swap(source_image_url: str, target_image_url: str) -> dict:
    """
    Perform face swap using AKOOL API.

    Args:
        source_image_url: URL of the source face image (the face to use)
        target_image_url: URL of the target image (the body/scene to place the face on)

    Returns:
        dict with job_id and status
    """
    token = await get_akool_token()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AKOOL_BASE_URL}/faceswap/highquality/specifyimage",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sourceImage": [
                    {
                        "path": source_image_url,
                        "opts": "face1",
                    }
                ],
                "targetImage": [
                    {
                        "path": target_image_url,
                        "opts": "face1",
                    }
                ],
                "face_enhance": 1,
                "modifyImage": target_image_url,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_face_swap_status(job_id: str) -> dict:
    """Check the status of a face swap job."""
    token = await get_akool_token()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{AKOOL_BASE_URL}/faceswap/highquality/infobymodelid",
            headers={"Authorization": f"Bearer {token}"},
            params={"_id": job_id},
        )
        resp.raise_for_status()
        return resp.json()
