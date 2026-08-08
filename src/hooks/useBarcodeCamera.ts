import { useEffect, useRef, useState } from "react";

export default function useBarcodeCamera(onDetected: (barcode: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");

  const stop = () => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  const start = async () => {
    setError("");
    if (!("BarcodeDetector" in window))
      return setError("Camera scanning is not supported here. Enter the barcode below.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      let lastCheck = 0;
      const scan = async (time: number) => {
        if (time - lastCheck > 350) {
          lastCheck = time;
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) { stop(); onDetected(codes[0].rawValue); return; }
        }
        frameRef.current = requestAnimationFrame(scan);
      };
      frameRef.current = requestAnimationFrame(scan);
    } catch {
      setError("Camera unavailable. Allow camera access or enter the barcode below.");
      stop();
    }
  };

  useEffect(() => stop, []);
  return { videoRef, active, error, start, stop };
}
