/// <reference lib="webworker" />

declare function importScripts(...urls: string[]): void;

// ✅ Load OpenCV from your public folder
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
        console.log("Worker: OpenCV Ready and Loaded!");
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
    if (!cv) {
      try {
        await loadOpenCV();
      } catch (e) {
        self.postMessage({ status: "error", error: "Failed to load OpenCV" });
        return;
      }
    }

    try {
      // 1. Convert Bitmaps to OpenCV Matrices (RGBA format)
      const srcRgba = await bitmapToMat(imageBitmap);
      const maskRgba = await bitmapToMat(maskBitmap);

      // 2. Convert Source to RGB (OpenCV inpaint crashes on RGBA images)
      const srcRgb = new cv.Mat();
      cv.cvtColor(srcRgba, srcRgb, cv.COLOR_RGBA2RGB);

      // 3. Prepare Mask (Extract the Alpha channel where the user drew)
      const maskGray = new cv.Mat();
      // Extract just the transparency layer from the mask canvas
      const rgbaPlanes = new cv.MatVector();
      cv.split(maskRgba, rgbaPlanes);
      rgbaPlanes.get(3).copyTo(maskGray); // Get Alpha channel
      rgbaPlanes.delete();

      // Ensure the mask is strictly binary (Black and White)
      cv.threshold(maskGray, maskGray, 10, 255, cv.THRESH_BINARY);

      // 4. Run OpenCV Inpainting
      const dstRgb = new cv.Mat();

      // ✅ USING INPAINT_NS (Navier-Stokes) for smoother, higher quality fills.
      // A radius of 10 gives it enough surrounding pixels to blend nicely.
      cv.inpaint(srcRgb, maskGray, dstRgb, 10, cv.INPAINT_NS);

      // 5. Convert Result back to RGBA for Browser Canvas
      const dstRgba = new cv.Mat();
      cv.cvtColor(dstRgb, dstRgba, cv.COLOR_RGB2RGBA);

      // Restore original alpha channel from the source image
      const finalPlanes = new cv.MatVector();
      const originalPlanes = new cv.MatVector();
      cv.split(dstRgba, finalPlanes);
      cv.split(srcRgba, originalPlanes);
      originalPlanes.get(3).copyTo(finalPlanes.get(3)); // Copy original alpha
      cv.merge(finalPlanes, dstRgba);

      // 6. Export to ImageData
      const imgData = new ImageData(
        new Uint8ClampedArray(dstRgba.data),
        dstRgba.cols,
        dstRgba.rows,
      );

      // 7. Cleanup Memory (CRITICAL: Prevents browser tab from crashing)
      srcRgba.delete();
      maskRgba.delete();
      srcRgb.delete();
      maskGray.delete();
      dstRgb.delete();
      dstRgba.delete();
      finalPlanes.delete();
      originalPlanes.delete();

      // 8. Return to UI
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
