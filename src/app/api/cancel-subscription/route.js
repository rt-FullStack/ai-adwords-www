import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { subscriptionId, email } = await request.json();
    console.log('Received cancellation request:', { subscriptionId, email });

    // Validate subscription ID format
    if (!subscriptionId || !subscriptionId.startsWith('I-')) {
      console.error('Invalid subscription ID format:', subscriptionId);
      return NextResponse.json(
        { error: 'Invalid subscription ID format. Must start with "I-"' },
        { status: 400 }
      );
    }

    // PayPal API credentials
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing PayPal credentials');
      return NextResponse.json(
        { error: 'PayPal credentials not configured' },
        { status: 500 }
      );
    }

    // Get access token
    console.log('Requesting PayPal access token...');
    const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('PayPal token error response:', errorText);
      return NextResponse.json(
        { error: 'Failed to get PayPal access token', details: errorText },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      return NextResponse.json(
        { error: 'Invalid PayPal token response' },
        { status: 500 }
      );
    }

    console.log('Successfully obtained PayPal access token');

    // First, verify the subscription exists and is active
    console.log('Verifying subscription status:', subscriptionId);
    const verifyResponse = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const verifyData = await verifyResponse.json();
    console.log('Subscription verification response:', verifyData);

    if (!verifyResponse.ok) {
      console.error('Failed to verify subscription:', verifyData);
      return NextResponse.json(
        { error: 'Failed to verify subscription', details: verifyData },
        { status: verifyResponse.status }
      );
    }

    // Check if subscription is already cancelled
    if (verifyData.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    // Cancel subscription
    console.log('Attempting to cancel subscription:', subscriptionId);
    const cancelResponse = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          reason: 'Customer requested cancellation',
        }),
      }
    );

    // Get the response text first
    const responseText = await cancelResponse.text();
    console.log('PayPal cancellation response text:', responseText);

    let cancelData;
    try {
      // If the response is empty but status is 204 (No Content), consider it a success
      if (cancelResponse.status === 204 && !responseText) {
        console.log('Subscription cancelled successfully (204 No Content)');
        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled successfully',
          data: { status: 'CANCELLED' }
        });
      }
      
      cancelData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse PayPal response:', parseError);
      // If we get a 204 status, consider it a success even if we can't parse the response
      if (cancelResponse.status === 204) {
        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled successfully',
          data: { status: 'CANCELLED' }
        });
      }
      return NextResponse.json(
        { 
          error: 'Failed to parse PayPal response',
          details: responseText
        },
        { status: 500 }
      );
    }

    if (!cancelResponse.ok) {
      console.error('PayPal cancellation error:', cancelData);
      
      // Check if the error is because the subscription is already cancelled
      if (cancelData.name === 'UNPROCESSABLE_ENTITY' && 
          cancelData.message?.includes('already cancelled')) {
        return NextResponse.json(
          { 
            error: 'Subscription is already cancelled',
            details: cancelData
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Failed to cancel subscription', 
          details: cancelData,
          message: cancelData.message || 'Unknown error occurred'
        },
        { status: cancelResponse.status }
      );
    }

    console.log('Successfully cancelled subscription:', cancelData);

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: cancelData,
    });
  } catch (error) {
    console.error('Unexpected error in cancel-subscription:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel subscription',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}