import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input');

  if (!input || input.trim().length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // 如果没有配置 API Key，返回模拟数据用于测试
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      const mockPredictions = [
        {
          place_id: 'mock_1',
          description: `${input} Street, Auckland, New Zealand`
        },
        {
          place_id: 'mock_2', 
          description: `${input} Road, Auckland, New Zealand`
        },
        {
          place_id: 'mock_3',
          description: `${input} Avenue, Auckland, New Zealand`
        }
      ];
      
      return NextResponse.json({ predictions: mockPredictions });
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&types=geocode&components=country:nz`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      return NextResponse.json({ predictions: data.predictions });
    } else {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: 'Failed to fetch suggestions' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching places autocomplete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 