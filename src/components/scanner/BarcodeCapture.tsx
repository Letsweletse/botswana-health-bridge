import React, { useState, useEffect } from "react";
import { Flashlight, FlashlightOff, Search, X, Scan, AlertCircle } from "lucide-react";
import useBarcodeCamera from "@/hooks/useBarcodeCamera";

interface BarcodeCaptureProps {
  onDetected: (barcode: string) => void;
  busy: boolean;
}

export default function BarcodeCapture({ onDetected, busy }: BarcodeCaptureProps) {
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const camera = useBarcodeCamera(onDetected);

  // Auto-start camera when component mounts
  useEffect(() => {
    camera.start();
    return () => camera.stop();
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onDetected(query.trim());
      setQuery("");
      setShowSearch(false);
    }
  };

  const isActive = camera.state === "active" || camera.state === "detected";
  const isLoading = camera.state === "requesting";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── VIEWFINDER ── */}
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "4/3",
        background: "#000",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}>
        {/* Video feed */}
        <video
          ref={camera.videoRef}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          playsInline muted autoPlay
        />
        <canvas ref={camera.canvasRef} style={{ display: "none" }} />

        {/* Dark overlay with scan window cutout */}
        {isActive && (
          <>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(rgba(0,0,0,0.5) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.5) 100%)",
              pointerEvents: "none",
            }} />

            {/* Scan window */}
            <div style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "78%", height: 110,
              borderRadius: 8,
            }}>
              {/* Corner brackets */}
              {[
                { top: 0, left: 0, borderTop: "3px solid #10b981", borderLeft: "3px solid #10b981", borderRadius: "6px 0 0 0" },
                { top: 0, right: 0, borderTop: "3px solid #10b981", borderRight: "3px solid #10b981", borderRadius: "0 6px 0 0" },
                { bottom: 0, left: 0, borderBottom: "3px solid #10b981", borderLeft: "3px solid #10b981", borderRadius: "0 0 0 6px" },
                { bottom: 0, right: 0, borderBottom: "3px solid #10b981", borderRight: "3px solid #10b981", borderRadius: "0 0 6px 0" },
              ].map((style, i) => (
                <div key={i} style={{ position: "absolute", width: 24, height: 24, ...style }} />
              ))}

              {/* Animated laser line */}
              <div style={{
                position: "absolute", left: 4, right: 4, height: 2,
                background: "linear-gradient(90deg, transparent, #10b981, #34d399, #10b981, transparent)",
                borderRadius: 2,
                boxShadow: "0 0 12px #10b981, 0 0 4px #34d399",
                animation: "laser 2s ease-in-out infinite",
              }} />
            </div>

            {/* Hint text */}
            <div style={{
              position: "absolute", bottom: 16, left: 0, right: 0,
              textAlign: "center", color: "rgba(255,255,255,0.7)",
              fontSize: 13, fontWeight: 500,
              letterSpacing: 0.3,
            }}>
              Align barcode within frame
            </div>
          </>
        )}

        {/* Loading state */}
        {isLoading && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#000", gap: 16,
          }}>
            <div style={{
              width: 48, height: 48,
              border: "3px solid #1f2937",
              borderTopColor: "#10b981",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }} />
            <p style={{ color: "#6b7280", fontSize: 14 }}>Starting camera...</p>
          </div>
        )}

        {/* Idle state */}
        {camera.state === "idle" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#0a0f1a", gap: 12,
          }}>
            <div style={{
              width: 64, height: 64, background: "#10b981",
              borderRadius: 18, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Scan size={32} color="white" />
            </div>
            <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>Ready to Scan</p>
            <p style={{ color: "#6b7280", fontSize: 13 }}>Tap below to start camera</p>
          </div>
        )}

        {/* Detected flash */}
        {camera.state === "detected" && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(16,185,129,0.15)",
            animation: "flash 0.3s ease-out",
            pointerEvents: "none",
          }} />
        )}

        {/* Error state */}
        {camera.state === "error" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#0a0f1a", gap: 12, padding: 24,
          }}>
            <AlertCircle size={36} color="#ef4444" />
            <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15, textAlign: "center" }}>
              {camera.error || "Camera unavailable"}
            </p>
            <button onClick={camera.start} style={{
              background: "#10b981", color: "white", border: "none",
              borderRadius: 10, padding: "10px 24px", fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}>Try Again</button>
          </div>
        )}

        {/* Torch button */}
        {isActive && camera.hasTorch && (
          <button onClick={camera.toggleTorch} style={{
            position: "absolute", top: 14, right: 14,
            background: camera.torch ? "#10b981" : "rgba(0,0,0,0.6)",
            border: "none", borderRadius: 12, width: 44, height: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "background 0.2s",
          }}>
            {camera.torch
              ? <FlashlightOff size={20} color="white" />
              : <Flashlight size={20} color="white" />
            }
          </button>
        )}

        {/* Close button when active */}
        {isActive && (
          <button onClick={camera.stop} style={{
            position: "absolute", top: 14, left: 14,
            background: "rgba(0,0,0,0.6)", border: "none",
            borderRadius: 12, width: 44, height: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <X size={20} color="white" />
          </button>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes laser {
          0% { top: 8px; opacity: 1; }
          48% { opacity: 1; }
          50% { top: calc(100% - 10px); opacity: 0.8; }
          98% { opacity: 1; }
          100% { top: 8px; opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* ── START BUTTON when idle or error ── */}
      {(camera.state === "idle" || camera.state === "error") && (
        <button onClick={camera.start} disabled={busy} style={{
          marginTop: 16,
          width: "100%", padding: "18px 0",
          background: "linear-gradient(135deg, #10b981, #059669)",
          border: "none", borderRadius: 16,
          color: "white", fontSize: 17, fontWeight: 800,
          cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", gap: 10,
          boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
          letterSpacing: 0.3,
        }}>
          <Scan size={22} />
          Scan Barcode
        </button>
      )}

      {/* ── MANUAL SEARCH ── */}
      <div style={{ marginTop: 12 }}>
        {!showSearch ? (
          <button onClick={() => setShowSearch(true)} style={{
            width: "100%", padding: "14px 0",
            background: "transparent",
            border: "1px solid #1f2937", borderRadius: 14,
            color: "#6b7280", fontSize: 14, fontWeight: 600,
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <Search size={16} />
            Type medicine name or barcode
          </button>
        ) : (
          <form onSubmit={submitSearch} style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Medicine name or barcode..."
                style={{
                  width: "100%", padding: "14px 14px 14px 42px",
                  background: "#111827", border: "1px solid #10b981",
                  borderRadius: 14, color: "#f1f5f9", fontSize: 15,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <button type="submit" style={{
              padding: "0 20px", background: "#10b981",
              border: "none", borderRadius: 14,
              color: "white", fontWeight: 700, fontSize: 14,
              cursor: "pointer", whiteSpace: "nowrap",
            }}>Find</button>
            <button type="button" onClick={() => setShowSearch(false)} style={{
              padding: "0 14px", background: "transparent",
              border: "1px solid #1f2937", borderRadius: 14,
              color: "#6b7280", cursor: "pointer",
            }}>
              <X size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
