import React, { useEffect, useRef } from "react";

interface Point {
  description: string;
  lat: number;
  lng: number;
}

interface MapViewProps {
  points: Point[];
}

const MapView: React.FC<MapViewProps> = ({ points }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!window.google || !mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: -36.8485, lng: 174.7633 }, // 奥克兰默认中心
        zoom: 12,
      });
    }
    // 清除旧的 marker
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    // 添加新 marker
    points.forEach((pt, idx) => {
      const marker = new window.google.maps.Marker({
        position: { lat: pt.lat, lng: pt.lng },
        map: mapInstance.current!,
        label: `${idx + 1}`,
        title: pt.description,
      });
      markersRef.current.push(marker);
    });
    // 画线
    if (polylineRef.current) polylineRef.current.setMap(null);
    if (points.length > 1) {
      polylineRef.current = new window.google.maps.Polyline({
        path: points.map(pt => ({ lat: pt.lat, lng: pt.lng })),
        geodesic: true,
        strokeColor: "#2196f3",
        strokeOpacity: 0.8,
        strokeWeight: 4,
      });
      polylineRef.current.setMap(mapInstance.current!);
    }
    // 自动适应所有点
    if (points.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      points.forEach(pt => bounds.extend({ lat: pt.lat, lng: pt.lng }));
      mapInstance.current.fitBounds(bounds);
    }
  }, [points]);

  return <div ref={mapRef} style={{ width: "100%", height: 400, borderRadius: 8, marginTop: 16 }} />;
};

export default MapView; 