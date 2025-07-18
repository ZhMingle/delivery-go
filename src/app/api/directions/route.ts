import { NextRequest, NextResponse } from 'next/server';

async function geocodeAddress(address: string, apiKey: string): Promise<{lat: number, lng: number} | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results.length > 0) {
    return data.results[0].geometry.location;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { waypoints } = await request.json();

    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return NextResponse.json(
        { error: 'At least two waypoints are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // Mock data if no API key
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      const mockRoute = {
        routes: [{
          legs: [{
            distance: { text: '5.2 km' },
            duration: { text: '12 mins' }
          }],
          overview_polyline: {
            points: 'mock_polyline_data'
          },
          waypoint_order: Array.from({length: waypoints.length - 2}, (_, i) => i) // mock 顺序
        }],
        waypoint_order: Array.from({length: waypoints.length - 2}, (_, i) => i)
      };
      return NextResponse.json(mockRoute);
    }

    // 先将所有地址转为经纬度
    const geocoded = await Promise.all(
      waypoints.map(addr => geocodeAddress(addr, apiKey))
    );
    if (geocoded.some(g => !g)) {
      return NextResponse.json(
        { error: 'Some addresses could not be geocoded', detail: geocoded.map((g, i) => g ? null : waypoints[i]) },
        { status: 400 }
      );
    }
    const latlngs = geocoded.map(g => `${g!.lat},${g!.lng}`);
    const origin = latlngs[0];
    const destination = latlngs[latlngs.length - 1];
    const midPoints = latlngs.slice(1, -1);
    const waypointsParam = midPoints.length > 0
      ? `&waypoints=optimize:true|${midPoints.join('|')}`
      : '';

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsParam}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      // 返回waypoint_order给前端
      return NextResponse.json({ ...data, waypoint_order: data.routes[0]?.waypoint_order || [] });
    } else {
      console.error('Google Directions API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: 'Failed to get directions' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error getting directions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 