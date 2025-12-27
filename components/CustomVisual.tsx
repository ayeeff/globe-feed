// components/CustomVisual.tsx - IMPROVED GARBAGE COLLECTION
"use client";
import { useEffect, useRef } from 'react';

interface CustomVisualProps {
  type?: string;
  css?: string;
  html?: string;
  scriptContent?: string;
  isActive: boolean;
}

export default function CustomVisual({ 
  type = 'custom', 
  css, 
  html, 
  scriptContent, 
  isActive 
}: CustomVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    console.log(`🎨 Initializing ${type} visualization...`);

    // CRITICAL: Store cleanup function
    const cleanup = () => {
      console.log(`🧹 Cleaning up ${type} visualization...`);
      
      // Remove script
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }

      // Remove style
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }

      // Clear container content
      if (container) {
        container.innerHTML = '';
      }

      // Clean up any THREE.js or Globe instances
      // @ts-ignore
      if (window.globeInstance) {
        try {
          // @ts-ignore
          const scene = window.globeInstance.scene();
          // @ts-ignore
          const renderer = window.globeInstance.renderer();
          
          if (renderer) {
            renderer.setAnimationLoop(null);
            renderer.forceContextLoss();
            renderer.dispose();
          }

          if (scene) {
            scene.traverse((object: any) => {
              if (!object.isMesh) return;

              if (object.geometry) {
                object.geometry.dispose();
              }

              if (object.material) {
                const materials = Array.isArray(object.material) 
                  ? object.material 
                  : [object.material];

                materials.forEach((mat: any) => {
                  if (mat.map) mat.map.dispose();
                  mat.dispose();
                });
              }
            });
            
            while(scene.children.length > 0){ 
              scene.remove(scene.children[0]); 
            }
          }
          
          // @ts-ignore
          window.globeInstance = null;
        } catch (err) {
          console.error('Globe cleanup error:', err);
        }
      }

      // Clean up Cesium
      // @ts-ignore
      if (window.cesiumViewer) {
        try {
          // @ts-ignore
          window.cesiumViewer.destroy();
          // @ts-ignore
          window.cesiumViewer = null;
        } catch (err) {
          console.error('Cesium cleanup error:', err);
        }
      }

      // Clean up Leaflet
      // @ts-ignore
      if (window.leafletMap) {
        try {
          // @ts-ignore
          window.leafletMap.remove();
          // @ts-ignore
          window.leafletMap = null;
        } catch (err) {
          console.error('Leaflet cleanup error:', err);
        }
      }
    };

    // 1. Inject HTML first
    if (html) {
      container.innerHTML = html;
    }

    // 2. Inject CSS
    if (css) {
      const style = document.createElement('style');
      style.textContent = css;
      container.appendChild(style);
      styleRef.current = style;
    }

    // 3. Inject Script with error handling
    if (scriptContent) {
      const script = document.createElement('script');
      
      // Wrap script in error boundary
      script.textContent = `
        (function() {
          try {
            const container = document.getElementById('viz-container-${type}');
            console.log('🚀 Executing ${type} script...');
            
            ${scriptContent}
            
            console.log('✅ ${type} script completed');
          } catch (err) {
            console.error("❌ Visual Error in ${type}:", err);
            
            // Show error in container
            const container = document.getElementById('viz-container-${type}');
            if (container) {
              container.innerHTML = \`
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; padding: 20px;">
                  <div>
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="margin-bottom: 8px;">Visualization Error</h3>
                    <p style="color: rgba(255,255,255,0.7); font-size: 14px;">\${err.message}</p>
                  </div>
                </div>
              \`;
            }
          }
        })();
      `;
      
      container.appendChild(script);
      scriptRef.current = script;
    }

    // Return cleanup function
    return cleanup;
  }, [type, css, html, scriptContent, isActive]);

  return (
    <div 
      ref={containerRef} 
      id={`viz-container-${type}`}
      className="w-full h-full relative"
      style={{ isolation: 'isolate' }} // Creates new stacking context
    />
  );
}
