/// <reference lib="webworker" />

// ✅ FIX: TypeScript declaration for importScripts
declare function importScripts(...urls: string[]): void;

// ✅ CONFIG: Load OpenCV from public folder
const OPENCV_URL = "/js/opencv.js";

let cv: any = null;

// Helper to load OpenCV
function loadOpenCV() {
  if (cv) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // @ts-ignore
    self.Module = {
      onRuntimeInitialized: () => {
        // @ts-ignore
        cv = self.cv;
        console.log("Worker: OpenCV Ready");
        resolve(null);
      },
    };
    try {
      importScripts(self.location.origin + OPENCV_URL);
    } catch (e) {
      reject(e);
    }
  });
}

self.onmessage = async (event: MessageEvent) => {
  const { action, imageBitmap, maskBitmap } = event.data;

  // --- 1. PRELOAD ---
  if (action === "preload") {
    try {
      await loadOpenCV();
      self.postMessage({ status: "ready" });
    } catch (e) {
      console.error(e);
      self.postMessage({ status: "error", error: "Failed to load OpenCV" });
    }
    return;
  }

  // --- 2. PROCESS ---
  if (action === "process") {
    if (!cv) await loadOpenCV();

    try {
      // 1. Convert Bitmaps to Matrices (RGBA format)
      const srcRgba = await bitmapToMat(imageBitmap);
      const maskRgba = await bitmapToMat(maskBitmap);

      // 2. Convert Source to RGB (Remove Alpha) - CRITICAL FIX
      // cv.inpaint crashes on RGBA images
      const srcRgb = new cv.Mat();
      cv.cvtColor(srcRgba, srcRgb, cv.COLOR_RGBA2RGB);

      // 3. Prepare Mask (Convert to Grayscale -> Binary)
      const maskGray = new cv.Mat();
      cv.cvtColor(maskRgba, maskGray, cv.COLOR_RGBA2GRAY);

      // ✅ IMPROVEMENT: Stronger threshold to ensure a solid mask
      cv.threshold(maskGray, maskGray, 5, 255, cv.THRESH_BINARY);

      // 4. Run Inpainting
      const dstRgb = new cv.Mat();

      // ✅ IMPROVEMENT: Increased radius to 10 for better blending, and using INPAINT_NS (Navier-Stokes) which often looks better than TELEA
      cv.inpaint(srcRgb, maskGray, dstRgb, 10, cv.INPAINT_NS);

      // 5. Convert Result back to RGBA for Browser
      const dstRgba = new cv.Mat();
      cv.cvtColor(dstRgb, dstRgba, cv.COLOR_RGB2RGBA);

      // 6. Export to ImageData
      const imgData = new ImageData(
        new Uint8ClampedArray(dstRgba.data),
        dstRgba.cols,
        dstRgba.rows,
      );

      // 7. Cleanup Memory (Prevent Leaks)
      srcRgba.delete();
      maskRgba.delete();
      srcRgb.delete();
      maskGray.delete();
      dstRgb.delete();
      dstRgba.delete();

      self.postMessage({ status: "done", result: imgData }, [
        imgData.data.buffer,
      ]);
    } catch (e: any) {
      let msg = e;
      if (typeof e === "number") {
        try {
          msg = cv.exceptionFromPtr(e).msg;
        } catch (x) {}
      }
      console.error("OpenCV Error:", msg);
      self.postMessage({ status: "error", error: "Processing Failed" });
    }
  }
};

// --- HELPER: ImageBitmap to cv.Mat ---
async function bitmapToMat(bitmap: ImageBitmap) {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return cv.matFromImageData(imageData);
}
