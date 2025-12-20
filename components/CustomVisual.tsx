"use client";
import React, { useEffect, useRef, useState } from 'react';

interface CustomVisualProps {
  css: string;
  html: string;
  scriptContent: string;
}

const CustomVisual: React.FC<CustomVisualProps> = ({ css, html, scriptContent }) => {
  const scriptRan = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
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

        // Load Globe.gl directly (it includes Three.js internally)
        if (!(window as any).Globe) {
          await loadScript("//unpkg.com/globe.gl@2.27.2/dist/globe.gl.min.js", "globe-lib");
        }
        console.log("✅ Globe Ready");

        setStatus("Preparing Container...");
        
        // Wait for DOM to be ready
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Ensure container exists
        const container = document.getElementById('globe-container');
        if (!container) {
          setStatus("Error: globe-container not found");
          return;
        }

        setStatus("Initializing Visualization...");
        
        // Execute user script
        if ((window as any).Globe) {
          try {
            // Wrap in additional delay to ensure Globe is fully ready
            setTimeout(() => {
              try {
                const runVisual = new Function(scriptContent);
                runVisual();
                
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
      const container = document.getElementById('globe-container');
      if (container) {
        // Clear any WebGL contexts
        const canvas = container.querySelector('canvas');
        if (canvas) {
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
          if (gl) {
            const loseContext = (gl as any).getExtension('WEBGL_lose_context');
            if (loseContext) loseContext.loseContext();
          }
        }
        // Clear container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };

  }, [scriptContent]);

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
        id="globe-container" 
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </>
  );
};

export default CustomVisual;
