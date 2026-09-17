import { NextResponse } from 'next/server';

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';

export async function POST(req: Request) {
  try {
    const { prompt, imageBase64, imageFormat } = await req.json();
    const apiKey = process.env.TRIPO_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    let payload: any = {};

    // ছবির মাধ্যমে ৩ডি মডেল তৈরি
    if (imageBase64) {
      // Data URL থেকে বিশুদ্ধ base64 আলাদা করা
      const base64Clean = imageBase64.split(',')[1] || imageBase64;
      payload = {
        type: 'image_to_model',
        file: {
          type: imageFormat || 'png',
          data: base64Clean,
        },
      };
    } else if (prompt) {
      // টেক্সটের মাধ্যমে ৩ডি মডেল তৈরি
      payload = {
        type: 'text_to_model',
        prompt: prompt,
      };
    } else {
      return NextResponse.json({ error: 'Image or prompt is required' }, { status: 400 });
    }

    const createRes = await fetch(`${TRIPO_API_BASE}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const createData = await createRes.json();

    if (createData.code !== 0) {
      return NextResponse.json(
        { error: createData.message || 'Failed to create task' },
        { status: 400 }
      );
    }

    return NextResponse.json({ taskId: createData.data.task_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');
  const fileUrl = searchParams.get('fileUrl');
  const apiKey = process.env.TRIPO_API_KEY;

  if (fileUrl) {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'model/gltf-binary',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID or File URL is required' }, { status: 400 });
  }

  try {
    const checkRes = await fetch(`${TRIPO_API_BASE}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const checkData = await checkRes.json();
    return NextResponse.json(checkData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}