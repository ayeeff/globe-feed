"use client";
import React, { useEffect, useRef, useState } from 'react';

interface CustomVisualProps {
  css: string;
  html: string;
  scriptContent: string;
  isActive?: boolean;
}

const CustomVisual: React.FC<CustomVisualProps> = ({ css, html, scriptContent, isActive = true }) => {
  const scriptRan = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const [status, setStatus] = useState<string>("Initializing...");

  useEffect(() => {
    if (scriptRan.current) return;

    const loadScript = (src: string, id: string) => {
      return new Promise((resolve, reject) => {
        const existing = document.getElementById(id);
        if (existing) {
          resolve(true); 
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = false;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });
    };

    const init = async () => {
      try {
        setStatus("Loading Globe Library...");

        if (!(window as any).Globe) {
          await loadScript("//unpkg.com/globe.gl@2.27.2/dist/globe.gl.min.js", "globe-lib");
        }
        console.log("✅ Globe Ready");

        setStatus("Preparing Container...");
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 100));

        setStatus("Initializing Visualization...");
        
        if ((window as any).Globe) {
          try {
            setTimeout(() => {
              try {
                // Create a wrapper to capture the globe instance
                const originalScript = scriptContent;
                const wrappedScript = `
                  (function() {
                    const originalGlobe = window.Globe;
                    let capturedInstance = null;
                    
                    // Intercept Globe creation
                    window.Globe = function(...args) {
                      const instance = originalGlobe(...args);
                      capturedInstance = instance;
                      return instance;
                    };
                    
                    // Run original script
                    ${originalScript}
                    
                    // Restore and return
                    window.Globe = originalGlobe;
                    return capturedInstance;
                  })();
                `;
                
                const runVisual = new Function(wrappedScript);
                globeInstanceRef.current = runVisual();
                
                scriptRan.current = true;
                setStatus("");
                console.log("✅ Visualization Started");
              } catch (execError: any) {
                console.error("Script Execution Error:", execError);
                setStatus("Script Error: " + execError.message);
              }
            }, 500);
          } catch (err: any) {
            console.error("Inner Error:", err);
            setStatus("Error: " + err.message);
          }
        } else {
          setStatus("Error: Globe symbol not available");
        }

      } catch (err: any) {
        console.error("Loader Error:", err);
        setStatus("Load Error: " + err.message);
      }
    };

    init();

    return () => {
      console.log("🧹 Cleaning up CustomVisual");
      
      // Stop globe animations
      if (globeInstanceRef.current) {
        try {
          const controls = globeInstanceRef.current.controls();
          if (controls) {
            controls.autoRotate = false;
          }
        } catch (e) {
          console.error("Error stopping animations:", e);
        }
      }
      
      const container = document.getElementById('globeViz') || document.getElementById('globe-container');
      if (container) {
        const canvas = container.querySelector('canvas');
        if (canvas) {
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
          if (gl) {
            const loseContext = (gl as any).getExtension('WEBGL_lose_context');
            if (loseContext) loseContext.loseContext();
          }
        }
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };

  }, [scriptContent]);

  // Pause/resume globe rotation based on active state
  useEffect(() => {
    if (!globeInstanceRef.current) return;

    try {
      const controls = globeInstanceRef.current.controls();
      if (controls) {
        controls.autoRotate = isActive;
      }
    } catch (e) {
      // Controls might not be available
    }
  }, [isActive]);

  return (
    <>
      {status && (
        <div className="fixed top-20 left-4 z-50 bg-blue-900/90 text-white px-4 py-2 rounded shadow-lg text-xs font-mono border border-blue-500">
          {status}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div 
        ref={containerRef}
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </>
  );
};

export default CustomVisual;
