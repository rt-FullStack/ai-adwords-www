import React, { useState, useEffect } from 'react';
import { FaGoogle } from 'react-icons/fa';

export default function GoogleAdsLogin({ onLoginSuccess, isAuthenticated }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Listen for the message from the OAuth popup
        const handleMessage = (event) => {
            if (event.data === 'oauth-success') {
                setIsLoading(false);
                onLoginSuccess();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onLoginSuccess]);

    const handleLogout = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('https://ai-adwords-263809614075.europe-north1.run.app/api/google-ads/logout', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Force reload to clear any cached state
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('https://ai-adwords-263809614075.europe-north1.run.app/api/google-ads/login', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            const authWindow = window.open(data.auth_url, 'Google Ads Login', 'width=600,height=600');

            if (!authWindow) {
                throw new Error('Popup was blocked. Please allow popups for this site.');
            }

            // The window will close itself and send a message when auth is complete
        } catch (error) {
            console.error('Login error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Connect Google Ads Account</h2>
            <p className="text-gray-600 mb-6 text-center">
                {isAuthenticated
                    ? "Switch to a different Google Ads account."
                    : "Connect your Google Ads account to import your campaigns and ads."
                }
            </p>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            <div className="flex gap-4">
                {isAuthenticated && (
                    <button
                        onClick={handleLogout}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium
                            ${isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        <FaGoogle className="text-xl" />
                        {isLoading ? 'Disconnecting...' : 'Disconnect Account'}
                    </button>
                )}

                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium
                        ${isLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    <FaGoogle className="text-xl" />
                    {isLoading ? 'Connecting...' : isAuthenticated ? 'Switch Account' : 'Connect Google Ads'}
                </button>
            </div>
        </div>
    );
} 