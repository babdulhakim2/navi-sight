import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { currentFrame, previousFrame } = await request.json();

    const response = await fetch('http://localhost:8000/compare-frames', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_frame: currentFrame,
        previous_frame: previousFrame
      })
    });

    if (!response.ok) {
      throw new Error('Failed to compare frames');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error comparing frames:', error);
    return NextResponse.json(
      { error: 'Failed to compare frames' },
      { status: 500 }
    );
  }
}
