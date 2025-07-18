import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import polyline from "polyline";

interface LeafletMapProps {
  origin?: string;
  destination?: string;
  onOriginChange?: (value: string) => void;
  onDestinationChange?: (value: string) => void;
}

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

interface RouteInfo {
  distance: string;
  duration: string;
  polyline: string;
}

export default function LeafletMap({ origin, destination, onOriginChange, onDestinationChange }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const originTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const destinationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // 防抖函数
  const debounce = useCallback((func: Function, delay: number) => {
    return (...args: any[]) => {
      if (originTimeoutRef.current) {
        clearTimeout(originTimeoutRef.current);
      }
      originTimeoutRef.current = setTimeout(() => func(...args), delay);
    };
  }, []);

  // 获取地址建议
  const fetchSuggestions = useCallback(async (input: string, setSuggestions: (suggestions: PlaceSuggestion[]) => void) => {
    if (!input || input.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
      const data = await response.json();
      
      if (data.predictions) {
        setSuggestions(data.predictions.map((pred: any) => ({
          place_id: pred.place_id,
          description: pred.description
        })));
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  // 处理起点输入变化
  const handleOriginChange = useCallback((value: string) => {
    onOriginChange?.(value);
    setShowOriginSuggestions(true);
    
    const debouncedFetch = debounce((input: string) => {
      fetchSuggestions(input, setOriginSuggestions);
    }, 300);
    
    debouncedFetch(value);
  }, [onOriginChange, debounce, fetchSuggestions]);

  // 处理终点输入变化
  const handleDestinationChange = useCallback((value: string) => {
    onDestinationChange?.(value);
    setShowDestinationSuggestions(true);
    
    const debouncedFetch = debounce((input: string) => {
      fetchSuggestions(input, setDestinationSuggestions);
    }, 300);
    
    debouncedFetch(value);
  }, [onDestinationChange, debounce, fetchSuggestions]);

  // 选择建议
  const selectSuggestion = useCallback((suggestion: PlaceSuggestion, isOrigin: boolean) => {
    if (isOrigin) {
      onOriginChange?.(suggestion.description);
      setShowOriginSuggestions(false);
      setOriginSuggestions([]);
    } else {
      onDestinationChange?.(suggestion.description);
      setShowDestinationSuggestions(false);
      setDestinationSuggestions([]);
    }
  }, [onOriginChange, onDestinationChange]);

  // 规划路线
  const planRoute = useCallback(async () => {
    if (!origin || !destination) {
      alert('请输入起点和终点');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ origin, destination }),
      });

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteInfo({
          distance: route.legs[0].distance.text,
          duration: route.legs[0].duration.text,
          polyline: route.overview_polyline.points,
        });

        // 在地图上绘制路线
        if (mapInstanceRef.current) {
          // 清除之前的路线
          if (routeLayerRef.current) {
            mapInstanceRef.current.removeLayer(routeLayerRef.current);
          }

          // 解码 polyline
          const points = polyline.decode(route.overview_polyline.points).map(([lat, lng]: [number, number]) => L.latLng(lat, lng));
          
          // 绘制新路线
          const routePolyline = L.polyline(points, {
            color: '#3B82F6',
            weight: 4,
            opacity: 0.8,
          }).addTo(mapInstanceRef.current);

          routeLayerRef.current = routePolyline;

          // 调整地图视图以显示整个路线
          mapInstanceRef.current.fitBounds(routePolyline.getBounds(), { padding: [20, 20] });
        }
      } else {
        alert('无法找到路线，请检查起点和终点');
      }
    } catch (error) {
      console.error('Error planning route:', error);
      alert('路线规划失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination]);

  return (
    <div className="w-screen h-screen relative">
      <div className="absolute top-12 left-12 z-[1000] bg-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="space-y-3">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">起点</label>
            <input
              type="text"
              value={origin || ""}
              onChange={e => handleOriginChange(e.target.value)}
              onFocus={() => setShowOriginSuggestions(true)}
              onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
              placeholder="请输入起点地址"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {showOriginSuggestions && originSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                {originSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.place_id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => selectSuggestion(suggestion, true)}
                  >
                    {suggestion.description}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">终点</label>
            <input
              type="text"
              value={destination || ""}
              onChange={e => handleDestinationChange(e.target.value)}
              onFocus={() => setShowDestinationSuggestions(true)}
              onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
              placeholder="请输入终点地址"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                {destinationSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.place_id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => selectSuggestion(suggestion, false)}
                  >
                    {suggestion.description}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={planRoute}
            disabled={isLoading || !origin || !destination}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? '规划中...' : '规划路线'}
          </button>
          {routeInfo && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <div className="text-sm text-gray-600">
                <div>距离: {routeInfo.distance}</div>
                <div>时间: {routeInfo.duration}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div id="map" ref={mapRef} className="w-full h-full" />
    </div>
  );
} 