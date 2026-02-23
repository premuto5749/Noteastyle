export const MAX_VIDEO_DURATION = 15;

/**
 * <video> 엘리먼트에 파일을 로드하여 duration(초)을 추출한다.
 * 일부 브라우저에서 duration이 Infinity로 반환되는 엣지케이스를 처리한다.
 */
export function loadVideoMetadata(
  file: File,
): Promise<{ duration: number; videoEl: HTMLVideoElement }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };

    const onLoaded = () => {
      // 일부 브라우저(Chrome)에서 Blob URL의 duration이 Infinity로 나오는 경우
      if (!isFinite(video.duration)) {
        video.currentTime = 1e10; // 끝으로 이동하여 duration 확정
        video.addEventListener(
          "timeupdate",
          function onSeek() {
            video.removeEventListener("timeupdate", onSeek);
            video.currentTime = 0;
            cleanup();
            resolve({ duration: video.duration, videoEl: video });
          },
          { once: true },
        );
        return;
      }
      cleanup();
      resolve({ duration: video.duration, videoEl: video });
    };

    const onError = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error("영상 파일을 읽을 수 없습니다."));
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
    video.src = url;
  });
}

/**
 * 영상 duration이 MAX_VIDEO_DURATION 이하인지 검증한다.
 */
export function validateVideoDuration(duration: number): {
  valid: boolean;
  message?: string;
} {
  if (duration > MAX_VIDEO_DURATION) {
    return {
      valid: false,
      message: `영상은 최대 ${MAX_VIDEO_DURATION}초까지 가능합니다. (현재 ${Math.ceil(duration)}초)`,
    };
  }
  return { valid: true };
}

/**
 * 비디오 엘리먼트의 0.5초 지점 프레임을 canvas로 그려 JPEG Blob을 생성한다.
 */
export function generateVideoThumbnail(
  videoEl: HTMLVideoElement,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const seekTime = Math.min(0.5, videoEl.duration || 0);
    videoEl.currentTime = seekTime;

    videoEl.addEventListener(
      "seeked",
      () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = videoEl.videoWidth;
          canvas.height = videoEl.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context를 생성할 수 없습니다."));
            return;
          }
          ctx.drawImage(videoEl, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("썸네일 생성에 실패했습니다."));
              }
            },
            "image/jpeg",
            0.8,
          );
        } catch (err) {
          reject(err);
        }
      },
      { once: true },
    );
  });
}
