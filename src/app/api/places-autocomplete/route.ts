import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  // 获取所有 query 参数
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  // 强制加上 key
  params.key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  try {
    const { data } = await axios.get(url, { params });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ status: 'ERROR', predictions: [] }, { status: 500 });
  }
} 