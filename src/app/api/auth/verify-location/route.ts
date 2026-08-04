import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signLocationToken } from '@/lib/auth';
import { distanceMeters, getOfficeConfig } from '@/lib/geo';

const bodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Valid lat and lng are required', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lat, lng } = parsed.data;
    const office = getOfficeConfig();
    const dist = distanceMeters(lat, lng, office.lat, office.lng);

    if (dist > office.radiusM) {
      return NextResponse.json(
        {
          ok: false,
          error: `You are ${dist}m from ${office.name} (required ≤${office.radiusM}m). Switch to WFH or move closer.`,
          distance_m: dist,
          radius_m: office.radiusM,
          office: { name: office.name, lat: office.lat, lng: office.lng },
        },
        { status: 403 }
      );
    }

    const token = signLocationToken({
      purpose: 'wfo_login',
      lat,
      lng,
      dist,
    });

    return NextResponse.json({
      ok: true,
      distance_m: dist,
      radius_m: office.radiusM,
      token,
      office: { name: office.name, lat: office.lat, lng: office.lng },
    });
  } catch (error: any) {
    console.error('verify-location Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
