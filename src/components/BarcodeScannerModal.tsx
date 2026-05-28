import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScanSuccess: (sku: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ onScanSuccess, onClose }: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'camera-viewfinder-scanner';

  // Sound generator for a premium cashier register "beep"
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // Standard high-pitch register beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); // Short 80ms sound duration
    } catch (e) {
      console.warn('AudioContext sound blocked or unsupported:', e);
    }
  };

  // 1. Fetch available cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          setSelectedCameraId(devices[0].id);
        } else {
          setError('No camera devices detected. Please attach a webcam.');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Camera permission denied or camera not supported.');
      });

    return () => {
      // Safety cleanup on unmount
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // 2. Start scanner when camera is selected
  useEffect(() => {
    if (!selectedCameraId) return;

    // If already scanning, stop it first
    const restartScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      try {
        setIsScanning(true);
        setError('');
        await html5QrCode.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: (width, height) => {
              // Standard wide box optimized for linear barcodes
              return { width: Math.floor(width * 0.8), height: Math.floor(height * 0.35) };
            },
            aspectRatio: 1.333333
          },
          (decodedText) => {
            playBeep();
            onScanSuccess(decodedText);
          },
          () => {
            // Quietly ignore failed frames during search
          }
        );
      } catch (err) {
        console.error('Failed to start scanner:', err);
        setError('Unable to link camera stream. Try selecting another device.');
        setIsScanning(false);
      }
    };

    restartScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [selectedCameraId, onScanSuccess]);

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCameraId(e.target.value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-panel border border-brand-cyan/30 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-900/60">
          <div className="flex items-center space-x-2 text-brand-cyan">
            <Camera className="w-5 h-5 animate-pulse" />
            <span className="font-outfit font-semibold text-slate-100">Live Camera Barcode Scanner</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-dark-700 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder scanner container */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[300px]">
          
          {error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center text-brand-rose bg-black/90">
              <span className="text-sm font-semibold mb-2">Scanner Initialization Failed</span>
              <p className="text-xs text-slate-400 max-w-xs">{error}</p>
            </div>
          )}

          {/* Camera Canvas Viewport */}
          <div id={containerId} className="w-full h-full overflow-hidden max-h-[360px]"></div>

          {/* Supermarket neon laser overlay scanner visual grid */}
          {isScanning && !error && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <div className="relative w-[80%] h-[35%] border-2 border-brand-cyan/60 rounded bg-brand-cyan/5">
                {/* Neon green laser line scanning up/down */}
                <div className="absolute left-0 right-0 h-0.5 bg-brand-cyan shadow-[0_0_10px_#06B6D4] animate-[scan_2s_linear_infinite]"></div>
                
                {/* Corner markers */}
                <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-brand-cyan"></span>
                <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-brand-cyan"></span>
                <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-brand-cyan"></span>
                <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-brand-cyan"></span>
              </div>
            </div>
          )}

        </div>

        {/* Scanner configurations */}
        <div className="p-4 bg-dark-800 border-t border-dark-700 space-y-3">
          
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-4 h-4 text-brand-cyan" />
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="flex-1 py-2 px-3 bg-dark-900 border border-dark-700 text-slate-200 rounded-xl outline-none focus:border-brand-cyan text-xs cursor-pointer"
            >
              {cameras.length === 0 ? (
                <option value="">Detecting camera sources...</option>
              ) : (
                cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Webcam Stream #${cam.id.slice(0, 5)}`}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-sans uppercase tracking-widest leading-relaxed">
              Hold the product barcode steadily in front of the camera box.<br />
              Accepts standard UPC, EAN, and Code-128 barcode labels.
            </p>
          </div>
          
        </div>

      </div>

      {/* Embedded scanning laser CSS animation */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}
