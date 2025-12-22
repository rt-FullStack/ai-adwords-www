// src/app/not-found.js
'use client'; // Add this if you're using client components

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NotFound() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't initialize Firebase during static generation
  if (!isClient) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2>404 - Page Not Found</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>404 - Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
        Go back home
      </Link>
    </div>
  );
}