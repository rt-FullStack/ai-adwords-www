import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { url } = await request.json();

        // Call the Python backend's new structure analysis endpoint
        const response = await fetch('https://ai-adwords-263809614075.europe-north1.run.app/analyze_website_structure', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            throw new Error('Python backend failed to process the request');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in generate_ads API:', error);
        return NextResponse.json(
            { error: 'Failed to generate ads structure' },
            { status: 500 }
        );
    }
} 