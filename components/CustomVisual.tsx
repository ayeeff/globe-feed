"use client";
import React, { useEffect, useRef, useState } from 'react';

interface CustomVisualProps {
  css: string;
  html: string;
  scriptContent: string;
}

const CustomVisual: React.FC<CustomVisualProps> = ({ css, html, scriptContent }) => {
  const scriptRan = useRef(false);
  const [status, setStatus] = useState<string>("Initializing...");

  useEffect(() => {
    if (scriptRan.current) return;

    const loadScript = (src: string, id: string) => {
      return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
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
        setStatus("Loading 3D Engine...");

        // 1. Load Three.js and expose to window
        if (!(window as any).THREE) {
          // Import Three.js dynamically to avoid SSR issues
          const THREE = await import('three');
          (window as any).THREE = THREE;
          console.log("✅ THREE Ready (from node_modules)");
        }

        // 2. Load Globe.gl (it will use window.THREE)
        setStatus("Loading Globe Library...");
        if (!(window as any).Globe) {
          await loadScript("//unpkg.com/globe.gl@2.30.0/dist/globe.gl.min.js", "globe-lib");
        }
        console.log("✅ Globe Ready");

        // 3. Execute user script with proper timing
        setStatus("Starting Visualization...");
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if ((window as any).Globe) {
          try {
            const runVisual = new Function(scriptContent);
            runVisual();
            
            scriptRan.current = true;
            setStatus("");
          } catch (execError: any) {
            console.error("Script Execution Error:", execError);
            setStatus("Script Error: " + execError.message);
          }
        } else {
          setStatus("Error: Globe symbol missing.");
        }

      } catch (err: any) {
        console.error("Loader Error:", err);
        setStatus("Error: " + err.message);
      }
    };

    init();

    return () => {
      const container = document.getElementById('globe-container');
      if (container) {
        // Clear any WebGL contexts
        const canvas = container.querySelector('canvas');
        if (canvas) {
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
          if (gl && (gl as any).getExtension) {
            (gl as any).getExtension('WEBGL_lose_context')?.loseContext();
          }
        }
        container.innerHTML = html;
      }
    };

  }, [scriptContent, html]);

  return (
    <>
      {status && (
        <div className="fixed top-20 left-4 z-50 bg-blue-900/90 text-white px-4 py-2 rounded shadow-lg text-xs font-mono border border-blue-500">
          STATUS: {status}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div 
        id="globe-container" 
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </>
  );
};

export default CustomVisual;
