"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { FaLinkedin, FaFacebook, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import logo from "../../public/adSaver.png";
import { useEffect, useState } from "react"; // ADDED: Import useState and useEffect
import Link from "next/link";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false); // ADDED: For hydration safety

  // ADDED: Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleScroll = (e, targetId) => {
    e.preventDefault();

    // ADDED: Check if we're on client side
    if (!isClient) return;

    if (pathname === "/") {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Store the target ID temporarily
      sessionStorage.setItem("scrollToId", targetId);
      router.push("/");
    }
  };

  // ADDED: Return null or skeleton during SSR to prevent hydration mismatch
  if (!isClient) {
    return (
      <footer className="bg-transparent" style={{ paddingTop: "10rem" }}>
        {/* Skeleton/placeholder during SSR */}
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start text-gray-700">
          <div className="flex flex-col items-center md:items-center text-center md:text-left">
            <div className="w-12 h-12 bg-gray-200 rounded mb-4"></div>
            <p className="mt-2 text-sm">Storgatan 16B</p>
            <p className="text-sm">392 32 KALMAR</p>
            <p className="text-sm">SWEDEN</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-transparent" style={{ paddingTop: "10rem" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start text-gray-700">
        {/* Logo and address */}
        <div className="flex flex-col items-center md:items-center text-center md:text-left">
          <Image 
            src={logo} 
            alt="AdSaver Logo" 
            width={50} 
            height={50} 
            className="pb-4"
            priority={false} // ADDED: Better for performance
          />
          <Link href="/"></Link>
          <p className="mt-2 text-sm">Storgatan 16B</p>
          <p className="text-sm">392 32 KALMAR</p>
          <p className="text-sm">SWEDEN</p>
        </div>

        {/* Links, internal */}
        <div className="grid grid-cols-3 gap-8 mt-6 md:mt-0 text-center md:text-left">
          <div>
            <h3 className="font-bold" style={{ color: '#4C84EC' }}>Product</h3>
            <ul className="mt-2 space-y-1">
              <li>
                <a 
                  href="https://adsaver.org/#pricing" 
                  className="hover:underline hover:font-semibold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Features
                </a>
              </li>
              <li>
                <button // CHANGED: From <a> to <button> for better accessibility
                  onClick={(e) => handleScroll(e, "pricing")}
                  className="hover:underline hover:font-semibold text-left w-full"
                  type="button"
                >
                  Pricing
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold" style={{ color: '#4C84EC' }}>Company</h3>
            <ul className="mt-2 space-y-1">
              <li>
                <a 
                  href="https://adsaver.org/about" 
                  className="hover:underline hover:font-semibold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  About Us
                </a>
              </li>
              <li>
                <a 
                  href="https://adsaver.org/contact" 
                  className="hover:underline hover:font-semibold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold" style={{ color: '#4C84EC' }}>Resources</h3>
            <ul className="mt-2 space-y-1">
              <li>
                <button // CHANGED: From <a> to <button>
                  onClick={(e) => handleScroll(e, "faq")}
                  className="hover:underline hover:font-semibold text-left w-full"
                  type="button"
                >
                  FAQ
                </button>
              </li>
              <li>
                <a 
                  href="https://adsaver.org/getStarted" 
                  className="hover:underline hover:font-semibold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Demo
                </a>
              </li>
              <li>
                <a 
                  href="https://adsaver.org/tutorials" 
                  className="hover:underline hover:font-semibold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tutorials
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Links, social media */}
        <div className="flex flex-col items-center md:items-center mt-6 md:mt-0">
          <h3 className="font-bold" style={{ color: '#4C84EC' }}>Social</h3>
          <div className="flex space-x-4 mt-2 text-xl">
            <a 
              href="https://x.com/i/communities/1855365411308474813" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-gray-500"
              aria-label="Visit our X (Twitter) page"
            >
              <FaXTwitter />
            </a>
            <a 
              href="https://www.facebook.com/groups/673107255720062" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-gray-500"
              aria-label="Visit our Facebook group"
            >
              <FaFacebook />
            </a>
            <a 
              href="https://www.youtube.com/@ADsaverorg" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-gray-500"
              aria-label="Visit our YouTube channel"
            >
              <FaYoutube />
            </a>
            <a 
              href="https://www.linkedin.com/company/adsaver-org/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-gray-500"
              aria-label="Visit our LinkedIn page"
            >
              <FaLinkedin />
            </a>
          </div>
        </div>
      </div>

      {/* Copyright, PP, ToS */}
      <div className="text-center text-sm text-gray-600 mt-8">
        <p>
          © 2025 AI-ADWORDS &nbsp;
        </p>
      </div>
    </footer>
  );
}