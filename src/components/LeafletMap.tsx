import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import polyline from "polyline";

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

interface RouteInfo {
  distance: string;
  duration: string;
  polyline: string;
}

export default function LeafletMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // mock 20个点，起点和终点都是 11 Moa Street, Otahuhu，其他为奥克兰南区/东区餐厅地址
  const mockAddresses = [
    "11 Moa Street, Otahuhu, Auckland, New Zealand",
    "792 Great South Road, Manukau, Auckland 2104, New Zealand", // The Coffee Club Manukau
    "1/652 Great South Road, Manukau, Auckland 2104, New Zealand", // Nando's Manukau
    "219 Great South Road, Papatoetoe, Auckland 2025, New Zealand", // Curry Leaf
    "2/30 Kolmar Road, Papatoetoe, Auckland 2025, New Zealand", // Kolmar Road Takeaways
    "451 Ti Rakau Drive, Botany, Auckland 2013, New Zealand", // Botany Town Centre Food Court
    "309 Botany Road, Botany Downs, Auckland 2010, New Zealand", // Botany Junction
    "345 Chapel Road, Flat Bush, Auckland 2016, New Zealand", // The Coffee Club Flat Bush
    "124 Dawson Road, Clover Park, Auckland 2023, New Zealand", // Lucky Star Takeaway
    "1/2 Bishop Dunn Place, Flat Bush, Auckland 2013, New Zealand", // Shamiana Ormiston
    "1/2 Fencible Drive, Howick, Auckland 2014, New Zealand", // Howick Village Cafe
    "1/219 Burswood Drive, Burswood, Auckland 2013, New Zealand", // Burswood Takeaway
    "2/35 Cook Street, Howick, Auckland 2014, New Zealand", // Howick Chinese Restaurant
    "1/2 Aviemore Drive, Highland Park, Auckland 2010, New Zealand", // Highland Park Takeaway
    "1/2 Pigeon Mountain Road, Half Moon Bay, Auckland 2012, New Zealand", // Half Moon Bay Cafe
    "1/2 Bucklands Beach Road, Bucklands Beach, Auckland 2012, New Zealand", // Bucklands Beach Takeaway
    "1/2 Mellons Bay Road, Howick, Auckland 2014, New Zealand", // Mellons Bay Takeaway
    "1/2 Ridge Road, Howick, Auckland 2014, New Zealand", // Ridge Road Cafe
    "11 Moa Street, Otahuhu, Auckland, New Zealand" // 终点=起点
  ];

  const [waypoints, setWaypoints] = useState<string[]>(mockAddresses);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[][]>(mockAddresses.map(() => []));
  const [showSuggestions, setShowSuggestions] = useState<boolean[]>(mockAddresses.map(() => false));
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRefs = useRef<(NodeJS.Timeout | null)[]>([null, null]);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  useEffect(() => {
    const map = L.map("map").setView([-36.8485, 174.7633], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      map.remove();
    };
  }, []);

  // 新增：用于存储所有数字Marker的引用
  const markersRef = useRef<L.Marker[]>([]);

  // 获取地址建议
  const fetchSuggestions = useCallback(async (input: string, idx: number) => {
    if (!input || input.trim().length < 3) {
      setSuggestions(prev => {
        const copy = [...prev];
        copy[idx] = [];
        return copy;
      });
      return;
    }
    try {
      const response = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
      const data = await response.json();
      setSuggestions(prev => {
        const copy = [...prev];
        copy[idx] = data.predictions
          ? data.predictions.map((pred: any) => ({
              place_id: pred.place_id,
              description: pred.description,
            }))
          : [];
        return copy;
      });
    } catch {
      setSuggestions(prev => {
        const copy = [...prev];
        copy[idx] = [];
        return copy;
      });
    }
  }, []);

  // 输入变化
  const handleWaypointChange = (value: string, idx: number) => {
    setWaypoints(prev => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
    setShowSuggestions(prev => {
      const copy = [...prev];
      copy[idx] = true;
      return copy;
    });
    if (timeoutRefs.current[idx]) clearTimeout(timeoutRefs.current[idx]!);
    timeoutRefs.current[idx] = setTimeout(() => fetchSuggestions(value, idx), 300);
  };

  // 选择建议
  const selectSuggestion = (suggestion: PlaceSuggestion, idx: number) => {
    setWaypoints(prev => {
      const copy = [...prev];
      copy[idx] = suggestion.description;
      return copy;
    });
    setShowSuggestions(prev => {
      const copy = [...prev];
      copy[idx] = false;
      return copy;
    });
    setSuggestions(prev => {
      const copy = [...prev];
      copy[idx] = [];
      return copy;
    });
  };

  // 增加/删除途经点
  const addWaypoint = () => {
    setWaypoints(prev => {
      const copy = [...prev];
      copy.splice(copy.length - 1, 0, ""); // 在终点前插入
      return copy;
    });
    setSuggestions(prev => {
      const copy = [...prev];
      copy.splice(copy.length - 1, 0, []);
      return copy;
    });
    setShowSuggestions(prev => {
      const copy = [...prev];
      copy.splice(copy.length - 1, 0, false);
      return copy;
    });
    timeoutRefs.current.splice(timeoutRefs.current.length - 1, 0, null);
  };
  const removeWaypoint = (idx: number) => {
    if (waypoints.length <= 2) return;
    setWaypoints(prev => prev.filter((_, i) => i !== idx));
    setSuggestions(prev => prev.filter((_, i) => i !== idx));
    setShowSuggestions(prev => prev.filter((_, i) => i !== idx));
    timeoutRefs.current.splice(idx, 1);
  };

  // 渲染数字marker的函数
  const renderMarkers = useCallback((route: any, displayOrder: string[], focusedIdx: number | null) => {
    if (!mapInstanceRef.current) return;
    // 清除旧的数字Marker
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    const legs = route.legs;
    if (legs.length > 0) {
      // 起点
      const start = legs[0].start_location;
      const marker1 = L.marker([start.lat, start.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div class='marker-number' data-idx='0' style="background:${focusedIdx === 0 ? '#f59e42' : '#2563eb'};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);transition:background 0.2s,transform 0.2s;position:relative;z-index:200;${focusedIdx === 0 ? 'transform:scale(1.3);' : ''}">0</div>`,
          iconSize: [focusedIdx === 0 ? 36 : 28, focusedIdx === 0 ? 36 : 28],
          iconAnchor: [focusedIdx === 0 ? 18 : 14, focusedIdx === 0 ? 18 : 14],
        })
      }).addTo(mapInstanceRef.current);
      marker1.bindTooltip(displayOrder[0], {direction: 'top', offset: [0, -16], className: 'marker-tooltip'});
      markersRef.current.push(marker1);
      for (let i = 0; i < legs.length; i++) {
        let end = legs[i].end_location;
        if (i === legs.length - 1) {
          end = {
            lat: end.lat + 0.0005,
            lng: end.lng + 0.0005,
          };
        }
        const marker = L.marker([end.lat, end.lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div class='marker-number' data-idx='${i+1}' style="background:${focusedIdx === i+1 ? '#f59e42' : '#2563eb'};color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);transition:background 0.2s,transform 0.2s;position:relative;z-index:200;${focusedIdx === i+1 ? 'transform:scale(1.3);' : ''}">${i+1}</div>`,
            iconSize: [focusedIdx === i+1 ? 36 : 28, focusedIdx === i+1 ? 36 : 28],
            iconAnchor: [focusedIdx === i+1 ? 18 : 14, focusedIdx === i+1 ? 18 : 14],
          })
        }).addTo(mapInstanceRef.current);
        marker.bindTooltip(displayOrder[i+1], {direction: 'top', offset: [0, -16], className: 'marker-tooltip'});
        markersRef.current.push(marker);
      }
      // hover效果代码保留
      setTimeout(() => {
        document.querySelectorAll('.marker-number').forEach(el => {
          el.addEventListener('mouseenter', function(this: HTMLElement) {
            this.style.background = '#f59e42';
            this.style.zIndex = '9999';
            this.style.position = 'relative';
          });
          el.addEventListener('mouseleave', function(this: HTMLElement) {
            this.style.background = '#2563eb';
            this.style.zIndex = '200';
            this.style.position = 'relative';
          });
        });
      }, 0);
    }
  }, []);

  // 保存当前路线和顺序
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [currentDisplayOrder, setCurrentDisplayOrder] = useState<string[]>([]);

  // 规划路线
  const planRoute = useCallback(async () => {
    if (waypoints.some(w => !w.trim()) || waypoints.length < 2) {
      alert("请填写所有点（至少两个）");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints }),
      });
      const data = await response.json();
      // 处理最优顺序
      let displayOrder = waypoints;
      if (data.waypoint_order && Array.isArray(data.waypoint_order) && data.waypoint_order.length === waypoints.length - 2) {
        // 重新排列：起点 + 最优途经点顺序 + 终点
        const midPoints = data.waypoint_order.map((idx: number) => waypoints[idx + 1]);
        displayOrder = [waypoints[0], ...midPoints, waypoints[waypoints.length - 1]];
      }
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteInfo({
          distance: route.legs.reduce((acc: string, leg: any) => acc + " " + leg.distance.text, ""),
          duration: route.legs.reduce((acc: string, leg: any) => acc + " " + leg.duration.text, ""),
          polyline: route.overview_polyline.points,
        });
        if (mapInstanceRef.current) {
          if (routeLayerRef.current) mapInstanceRef.current.removeLayer(routeLayerRef.current);
          const points = polyline.decode(route.overview_polyline.points).map(([lat, lng]: [number, number]) => L.latLng(lat, lng));
          const routePolyline = L.polyline(points, {
            color: '#3B82F6',
            weight: 4,
            opacity: 0.8,
          }).addTo(mapInstanceRef.current);
          routeLayerRef.current = routePolyline;
          mapInstanceRef.current.fitBounds(routePolyline.getBounds(), { padding: [20, 20] });
          setCurrentRoute(route);
          setCurrentDisplayOrder(displayOrder);
          renderMarkers(route, displayOrder, focusedIdx);
        }
        // 同步输入框顺序为最优顺序
        setWaypoints(displayOrder);
        setSuggestions(displayOrder.map(() => []));
        setShowSuggestions(displayOrder.map(() => false));
      } else {
        alert('无法找到路线，请检查输入');
      }
    } catch (error) {
      alert('路线规划失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [waypoints, renderMarkers, focusedIdx]);

  // focusedIdx变化时刷新marker高亮
  useEffect(() => {
    if (currentRoute && currentDisplayOrder.length > 0) {
      renderMarkers(currentRoute, currentDisplayOrder, focusedIdx);
    }
  }, [focusedIdx]);

  return (
    <div className="w-screen h-screen relative">
      <div className="absolute top-12 left-12 z-[1000] bg-white p-4 rounded-lg shadow-lg max-w-sm w-[20rem] flex flex-col" style={{height: '90vh'}}>
        <div className="flex-1 overflow-y-auto space-y-3 p-2">
          {waypoints.map((w, idx) => (
            <div className="relative" key={idx}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {idx === 0 ? "起点" : idx === waypoints.length - 1 ? "终点" : `途经点${idx}`}
              </label>
              <input
                type="text"
                value={w}
                onChange={e => handleWaypointChange(e.target.value, idx)}
                onFocus={() => setFocusedIdx(idx)}
                onBlur={() => setFocusedIdx(null)}
                placeholder={`请输入${idx === 0 ? "起点" : idx === waypoints.length - 1 ? "终点" : "途经点"}地址`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {showSuggestions[idx] && suggestions[idx] && suggestions[idx].length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                  {suggestions[idx].map((suggestion) => (
                    <div
                      key={suggestion.place_id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => selectSuggestion(suggestion, idx)}
                    >
                      {suggestion.description}
                    </div>
                  ))}
                </div>
              )}
              {waypoints.length > 2 && (
                <button
                  type="button"
                  className="absolute right-2 top-2 text-red-500"
                  onClick={() => removeWaypoint(idx)}
                  style={{ zIndex: 10 }}
                >×</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2 bg-white">
          <button
            type="button"
            onClick={addWaypoint}
            className="bg-gray-200 text-gray-700 py-1 px-2 rounded-md hover:bg-gray-300 flex-1"
          >+ 添加途经点</button>
          <button
            onClick={planRoute}
            disabled={isLoading || waypoints.some(w => !w.trim()) || waypoints.length < 2}
            className="bg-blue-500 text-white py-1 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex-1"
          >
            {isLoading ? '规划中...' : '规划路线'}
          </button>
        </div>
      </div>
      <div id="map" ref={mapRef} className="w-full h-full" />
      
    </div>
  );
} 