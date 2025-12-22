import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        console.log('=== API Route: analyze-structure ===');
        const { url, language } = await request.json();
        console.log('Received request:', { url, language });

        // Call the Python backend's structure analysis endpoint
        console.log('Sending request to Python backend...');
        const response = await fetch('https://ai-adwords-263809614075.europe-north1.run.app/analyze_website_structure', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, language }),
        });

        console.log('Python backend response status:', response.status);
        const data = await response.json();
        console.log('Python backend response data:', data);

        if (!response.ok) {
            console.error('Python backend error:', data);
            throw new Error(data.error || data.details || 'Python backend failed to analyze website structure');
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in analyze-structure API:', error);
        console.error('Error details:', error.message);
        return NextResponse.json(
            {
                error: 'Failed to analyze website structure',
                details: error.message
            },
            { status: 500 }
        );
    }
} 