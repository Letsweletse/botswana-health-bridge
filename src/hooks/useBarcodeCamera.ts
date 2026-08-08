import { useEffect, useRef, useState, useCallback } from "react";

export type ScannerState = "idle" | "requesting" | "active" | "detected" | "error" | "unsupported";

export default function useBarcodeCamera(onDetected: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const detectorRef = useRef<any>(null);
  const lastDetectedRef = useRef<string>("");
  const cooldownRef = useRef<boolean>(false);

  const [state, setState] = useState<ScannerState>("idle");
  const [error, setError] = useState("");
  const [torch, setTorch] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const newTorch = !torch;
      await track.applyConstraints({ advanced: [{ torch: newTorch } as any] });
      setTorch(newTorch);
    } catch (_) {}
  }, [torch]);

  const start = useCallback(async () => {
    setError("");
    setState("requesting");

    // Stop any existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());

    try {
      // Request highest quality rear camera with focus
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: "continuous" as any,
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Apply advanced camera settings for best scanning
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;

      // Check torch
      if (capabilities?.torch) setHasTorch(true);

      // Apply continuous autofocus + optimal settings
      try {
        await track.applyConstraints({
          advanced: [{
            focusMode: "continuous",
            exposureMode: "continuous",
            whiteBalanceMode: "continuous",
          } as any],
        });
      } catch (_) {}

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      setState("active");

      // Use native BarcodeDetector if available (fastest)
      if ("BarcodeDetector" in window) {
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "data_matrix", "qr_code"],
        });
        startNativeScan();
      } else {
        // Fallback: use canvas + ZXing-style detection via Quagga2
        startFallbackScan();
      }
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access in your browser settings."
        : err?.name === "NotFoundError"
        ? "No camera found on this device."
        : "Camera unavailable. Use the search box below.";
      setError(msg);
      setState("error");
    }
  }, []);

  const handleDetection = useCallback((value: string) => {
    if (!value || cooldownRef.current) return;
    if (value === lastDetectedRef.current) return;

    // Haptic feedback
    try { navigator.vibrate?.(80); } catch (_) {}

    lastDetectedRef.current = value;
    cooldownRef.current = true;
    setState("detected");

    cancelAnimationFrame(frameRef.current);
    setTimeout(() => {
      cooldownRef.current = false;
      lastDetectedRef.current = "";
    }, 2000);

    onDetected(value);
  }, [onDetected]);

  const startNativeScan = useCallback(() => {
    let lastScan = 0;

    const scan = async (timestamp: number) => {
      if (!videoRef.current || !detectorRef.current) return;
      if (videoRef.current.readyState < 2) {
        frameRef.current = requestAnimationFrame(scan);
        return;
      }

      // Scan every 200ms for speed
      if (timestamp - lastScan > 200) {
        lastScan = timestamp;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0) {
            const best = codes.reduce((a: any, b: any) =>
              (a.boundingBox?.width || 0) > (b.boundingBox?.width || 0) ? a : b
            );
            if (best.rawValue) {
              handleDetection(best.rawValue);
              return;
            }
          }
        } catch (_) {}
      }

      frameRef.current = requestAnimationFrame(scan);
    };

    frameRef.current = requestAnimationFrame(scan);
  }, [handleDetection]);

  const startFallbackScan = useCallback(() => {
    // Canvas-based scanning fallback
    const canvas = canvasRef.current;
    if (!canvas) {
      setState("unsupported");
      setError("Camera scanning not supported on this browser. Use the search box below.");
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let lastScan = 0;

    const scan = (timestamp: number) => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        frameRef.current = requestAnimationFrame(scan);
        return;
      }

      if (timestamp - lastScan > 300) {
        lastScan = timestamp;
        const v = videoRef.current;
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      }

      frameRef.current = requestAnimationFrame(scan);
    };

    frameRef.current = requestAnimationFrame(scan);
    setState("unsupported");
    setError("Barcode scanning not supported on this browser. Please type the barcode below.");
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, canvasRef, state, error, hasTorch, torch, start, stop, toggleTorch };
}
