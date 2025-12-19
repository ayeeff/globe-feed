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

        // 1. Load Three.js
        if (!(window as any).THREE) {
          await loadScript("//unpkg.com/three@0.160.0/build/three.min.js", "three-lib");
        }
        console.log("✅ THREE Ready");

        // 2. Load Globe.gl
        setStatus("Loading Globe Library...");
        if (!(window as any).Globe) {
          await loadScript("//unpkg.com/globe.gl@2.30.0/dist/globe.gl.min.js", "globe-lib");
        }
        console.log("✅ Globe Ready");

        // 3. Wait for DOM and execute user script
        setStatus("Starting Visualization...");
        
        // Use requestAnimationFrame to ensure DOM is painted
        requestAnimationFrame(() => {
          setTimeout(() => {
            if ((window as any).Globe) {
              try {
                // Execute the code stored in Supabase
                const runVisual = new Function(scriptContent);
                runVisual();
                
                scriptRan.current = true;
                setStatus(""); // Clear Debug Message
              } catch (execError: any) {
                console.error("Script Execution Error:", execError);
                setStatus("Error executing script: " + execError.message);
              }
            } else {
              setStatus("Error: Globe symbol missing.");
            }
          }, 300); // Increased delay to ensure everything is ready
        });

      } catch (err: any) {
        console.error("Loader Error:", err);
        setStatus("Error: " + err.message);
      }
    };

    init();

    // Cleanup function
    return () => {
      // Clean up any globe instances
      const container = document.getElementById('globe-container');
      if (container) {
        container.innerHTML = html; // Reset to original HTML
      }
    };

  }, [scriptContent, html]);

  return (
    <>
      {/* Debug Overlay */}
      {status && (
        <div className="fixed top-20 left-4 z-50 bg-blue-900/90 text-white px-4 py-2 rounded shadow-lg text-xs font-mono border border-blue-500">
          STATUS: {status}
        </div>
      )}

      {/* Styles */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Container */}
      <div 
        id="globe-container" 
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </>
  );
};

export default CustomVisual;
