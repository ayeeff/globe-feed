// components/CustomVisual.tsx - WITH CESIUM SUPPORT
"use client";
import React, { useEffect, useRef, useState } from 'react';

interface CustomVisualProps {
  css: string;
  html: string;
  scriptContent: string;
  isActive?: boolean;
}

const CustomVisual: React.FC<CustomVisualProps> = ({ css, html, scriptContent, isActive = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const cleanupFnRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<string>("Initializing...");
  const mountedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (mountedRef.current) return;
    mountedRef.current = true;

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

    const loadStylesheet = (href: string, id: string) => {
      return new Promise((resolve, reject) => {
        const existing = document.getElementById(id);
        if (existing) {
          resolve(true);
          return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.id = id;
        link.onload = () => resolve(true);
        link.onerror = () => reject(new Error(`Failed to load ${href}`));
        document.head.appendChild(link);
      });
    };

    const init = async () => {
      try {
        // Detect which library is needed based on script content
        const needsCesium = scriptContent.includes('Cesium.') || html.includes('cesium');
        const needsGlobe = scriptContent.includes('Globe(') || scriptContent.includes('window.Globe');

        if (needsCesium) {
          setStatus("Loading Cesium Library...");
          
          // Load Cesium CSS
          await loadStylesheet(
            "https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Widgets/widgets.css",
            "cesium-css"
          );
          
          // Load Cesium JS
          if (!(window as any).Cesium) {
            await loadScript(
              "https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Cesium.js",
              "cesium-lib"
            );
          }
          console.log("✅ Cesium Ready");
        }

        if (needsGlobe) {
          setStatus("Loading Globe Library...");
          
          if (!(window as any).Globe) {
            await loadScript("//unpkg.com/globe.gl@2.27.2/dist/globe.gl.min.js", "globe-lib");
          }
          console.log("✅ Globe Ready");
        }

        setStatus("Preparing Container...");
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 100));

        setStatus("Initializing Visualization...");
        
        setTimeout(() => {
          try {
            // CRITICAL: Store cleanup function
            cleanupFnRef.current = () => {
              console.log("🧹 Executing stored cleanup for visualization");
              
              // Clean up globe instance
              if (globeInstanceRef.current) {
                try {
                  const controls = globeInstanceRef.current.controls();
                  if (controls) {
                    controls.autoRotate = false;
                    controls.dispose();
                  }
                } catch (e) {
                  console.error("Error disposing controls:", e);
                }
                globeInstanceRef.current = null;
              }
              
              // Clean up Cesium viewer if exists
              if ((window as any).cesiumViewer) {
                try {
                  (window as any).cesiumViewer.destroy();
                  (window as any).cesiumViewer = null;
                } catch (e) {
                  console.error("Error destroying Cesium viewer:", e);
                }
              }
              
              // Clean up DOM containers
              const containers = ['globeViz', 'globe-container', 'cesiumContainer'];
              containers.forEach(id => {
                const container = document.getElementById(id);
                if (container) {
                  const canvas = container.querySelector('canvas');
                  if (canvas) {
                    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
                    if (gl) {
                      const loseContext = (gl as any).getExtension('WEBGL_lose_context');
                      if (loseContext) loseContext.loseContext();
                    }
                  }
                  // Remove all children
                  while (container.firstChild) {
                    container.removeChild(container.firstChild);
                  }
                }
              });
            };

            // Wrap script to capture instances
            const wrappedScript = needsGlobe ? `
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
                ${scriptContent}
                
                // Restore and return
                window.Globe = originalGlobe;
                return capturedInstance;
              })();
            ` : `
              (function() {
                ${scriptContent}
              })();
            `;
            
            const runVisual = new Function(wrappedScript);
            globeInstanceRef.current = runVisual();
            
            setStatus("");
            console.log("✅ Visualization Started");
          } catch (execError: any) {
            console.error("Script Execution Error:", execError);
            setStatus("Script Error: " + execError.message);
          }
        }, 500);

      } catch (err: any) {
        console.error("Loader Error:", err);
        setStatus("Load Error: " + err.message);
      }
    };

    init();

    // CLEANUP on unmount
    return () => {
      console.log("🧹 CustomVisual unmounting - cleaning up");
      mountedRef.current = false;
      
      if (cleanupFnRef.current) {
        cleanupFnRef.current();
        cleanupFnRef.current = null;
      }
    };

  }, []); // Empty dependency array - only run once on mount

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
