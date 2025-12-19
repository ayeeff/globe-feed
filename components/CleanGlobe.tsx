"use client";
import React, { useEffect, useRef, useState } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';

interface CleanGlobeProps {
  // Allow any other props that react-globe.gl supports
  [key: string]: any; 
  config?: any; // The config object from Supabase
}

const CleanGlobe: React.FC<CleanGlobeProps> = ({ 
  config, 
  onGlobeReady, 
  ...globeProps 
}) => {
  // We use 'any' for the ref because the library types can be tricky
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [globeData, setGlobeData] = useState<any[]>([]);

  // 1. Combine Supabase config with direct props
  // This allows the config object to override props
  const combinedProps = { ...globeProps, ...config };

  // 2. Data Fetcher for GeoJSON URLs
  useEffect(() => {
    if (combinedProps.polygonDataUrl) {
      fetch(combinedProps.polygonDataUrl)
        .then(res => res.json())
        .then(data => {
            setGlobeData(data.features || data);
        });
    }
  }, [combinedProps.polygonDataUrl]);

  // 3. THE CRITICAL CLEANUP LOGIC
  useEffect(() => {
    setMounted(true);
    
    return () => {
      if (globeEl.current) {
        console.log('♻️ Disposing Globe WebGL Context...');

        const scene = globeEl.current.scene();
        const renderer = globeEl.current.renderer();
        const controls = globeEl.current.controls();

        if (renderer) {
          renderer.setAnimationLoop(null);
          renderer.forceContextLoss();
          renderer.dispose();
        }

        if (controls) {
          controls.dispose();
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
      }
      setMounted(false);
    };
  }, []);

  if (!mounted) return null;

  return (
    <Globe
      ref={globeEl}
      rendererConfig={{ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance" 
      }}
      backgroundColor="rgba(0,0,0,0)"
      atmosphereColor="#3a228a"
      atmosphereAltitude={0.15}
      // Inject the fetched data if URL exists
      polygonsData={combinedProps.polygonDataUrl ? globeData : combinedProps.polygonsData}
      {...combinedProps}
    />
  );
};

export default CleanGlobe;