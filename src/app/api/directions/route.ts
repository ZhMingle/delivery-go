import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination } = await request.json();

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // 如果没有配置 API Key，返回模拟数据
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      const mockRoute = {
        routes: [{
          legs: [{
            distance: { text: '5.2 km' },
            duration: { text: '12 mins' }
          }],
          overview_polyline: {
            points: 'mock_polyline_data'
          }
        }]
      };
      
      return NextResponse.json(mockRoute);
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return NextResponse.json(data);
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