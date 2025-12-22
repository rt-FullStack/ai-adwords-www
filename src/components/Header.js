"use client";

import Image from "next/image";
import Link from "next/link";
import adSaver from "/public/adSaver.png";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { RxHamburgerMenu, RxCross2 } from "react-icons/rx";
import { useAuth } from "@/components/authContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import Modal from "@/components/modal";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import NavLink from "@/components/NavLink/NavLink";
import Logo from "@/components/Logo/Logo";
import Button from "@/components/buttons";
import { useHandleSignOut } from "@/components/handleSignOut";
import { getFirestore } from 'firebase/firestore';
import { auth } from '@/components/authContext'; // or initialize separately

export default function Header() {
  const { signOut, currentUser, setSignOutCallback, setUserStatus, userSubscription } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [aiSlots, setAiSlots] = useState(0);
  const [isAiAdwordsOpen, setIsAiAdwordsOpen] = useState(false);
  const [isUserAccountOpen, setIsUserAccountOpen] = useState(false);
  const dropdownRef = useRef(null);
  const aiAdwordsRef = useRef(null);
  const userAccountRef = useRef(null);
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { handleSignOut: handleSignOutFromHook } = useHandleSignOut();
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSignOutClick = useCallback(async () => {
    try {
      setIsDropdownOpen(false);
      await handleSignOutFromHook();
      toast.success("Successfully signed out!");
      // Redirect to WordPress home page after sign out
      window.location.href = "https://aiadwords.com";
    } catch (error) {
      toast.error("Sign-out failed. Please try again.");
      console.error("Sign-out error:", error);
    }
  }, [handleSignOutFromHook]);

  // Handle scroll visibility
  useEffect(() => {
    // Only run on client side
    if (!isClient) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50 || currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isClient]);

  // Check for redirect from WordPress login
  useEffect(() => {
    // Only run on client side
    if (!isClient) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const fromWordPress = urlParams.get('from');
    const showLogin = urlParams.get('showLogin');
    
    // If coming from WordPress login page, open login modal
    if (fromWordPress === 'wordpress' && !currentUser) {
      setIsModalOpen(true);
      
      // Clean up URL without reloading page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    // If showLogin parameter is set
    if (showLogin === 'true' && !currentUser) {
      setIsModalOpen(true);
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentUser, isClient]);

  // Sign out callback effect
  useEffect(() => {
    if (setSignOutCallback) {
      setSignOutCallback();
      if (currentUser) {
        setIsModalOpen(false);
      }
    }
  }, [setSignOutCallback, currentUser]); // Added dependencies

  // Fetch AI slots
  useEffect(() => {
    if (!currentUser) {
      setAiSlots(0);
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    getDoc(userRef).then((doc) => {
      if (doc.exists()) {
        setAiSlots(doc.data().aiSlots || 0);
      }
    });

    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setAiSlots(doc.data().aiSlots || 0);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Click outside handlers - updated to work with hover
  useEffect(() => {
    // Only run on client side
    if (!isClient) return;

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (aiAdwordsRef.current && !aiAdwordsRef.current.contains(event.target)) {
        setIsAiAdwordsOpen(false);
      }
      if (userAccountRef.current && !userAccountRef.current.contains(event.target)) {
        setIsUserAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isClient]);

  // Handle login click - redirect to account if already logged in
  const handleLoginClick = useCallback(() => {
    if (currentUser) {
      router.push('/account');
    } else {
      setIsModalOpen(true);
      setIsMobileMenuOpen(false);
    }
  }, [currentUser, router]);

  const showPremiumFeatures = currentUser && userSubscription?.subscriptionStatus === "ACTIVE";

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 h-[172px] z-50 transition-transform duration-500 header-container ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
        suppressHydrationWarning
      >
        <div className="w-full flex flex-col">
          <div className="flex flex-row justify-between">
            {/* Logo and company name */}
            <Logo />

            {/* User Menu */}
            <div className="user-menu-container">
              {currentUser ? (
                <div ref={dropdownRef} className="relative">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                      <span className="text-sm font-medium">AI Slots:</span>
                      <span className="text-sm font-semibold text-blue-600">{aiSlots}</span>
                    </div>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-2 text-lg text-gray-600 hover:text-black transition-colors user-menu-button"
                    >
                      {currentUser.displayName || currentUser.email}
                    </button>
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <Link href="/account">
                        <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">My Account</button>
                      </Link>
                      <button
                        onClick={handleSignOutClick}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Button  
                  size="medium"
                  color="dark"
                  title="Sign in"
                  className="sign-in-button"
                  onClick={handleLoginClick}
                />
              )}         
            </div>
          </div>

          {/* Desktop navigation */}
          <div className="flex flex-row-reverse lg:flex-col-reverse">
            <nav>
              {/* Burger Menu */}
              <div className="lg:hidden flex justify-end mr-14">
                {!isMobileMenuOpen && (
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="text-[#242234] p-2"
                    aria-label="Open mobile menu"
                  >
                    <RxHamburgerMenu size={28} />
                  </button>
                )}
              </div>

              {/* Navigation links */}
              <div className="hidden lg:flex gap-6 justify-center w-full mt-2 mb-1 items-center">
                <NavLink href="/" text="Home" />
                
                {/* AI Adwords Dropdown - HOVER ENABLED */}
                <div 
                  ref={aiAdwordsRef} 
                  className="relative"
                  onMouseEnter={() => setIsAiAdwordsOpen(true)}
                  onMouseLeave={() => setIsAiAdwordsOpen(false)}
                >
                  <button
                    className="nav-dropdown-button"
                  >
                    AI Adwords
                  </button>
                  {isAiAdwordsOpen && showPremiumFeatures && (
                    <div className="absolute left-0 mt-0 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <Link href="/editor">
                        <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-blue-600 transition-colors">Editor</button>
                      </Link>
                      <Link href="/keywordcombiner">
                        <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-blue-600 transition-colors">Keyword Combiner</button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* PMax */}
                <NavLink href="/pmax" text="PMax" />

                {/* User Account Dropdown - HOVER ENABLED */}
                {currentUser && (
                  <div 
                    ref={userAccountRef} 
                    className="relative"
                    onMouseEnter={() => setIsUserAccountOpen(true)}
                    onMouseLeave={() => setIsUserAccountOpen(false)}
                  >
                    <button
                      className="nav-dropdown-button"
                    >
                      User Account
                    </button>
                    {isUserAccountOpen && (
                      <div className="absolute left-0 mt-0 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                        <Link href="/account">
                          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-blue-600 transition-colors">My Account</button>
                        </Link>
                        <button
                          onClick={handleSignOutClick}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-red-600 transition-colors">
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
     
        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <div 
            id="mobile-menu" 
            className="lg:hidden fixed top-[172px] right-4 w-fit bg-[#fef4e8] pl-10 pr-10 pb-10 shadow-lg z-[9990]"
          >
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-[#242234] hover:text-black"
            >
              <RxCross2 size={28} />
            </button>

            <div className="mt-12 flex flex-col gap-4">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                <p className="text-[18px] hover:underline">Home</p>
              </Link>

              {/* AI Adwords Mobile */}
              {showPremiumFeatures && (
                <>
                  <div className="border-t border-gray-300 pt-2">
                    <p className="text-[16px] font-semibold text-gray-600">AI Adwords</p>
                    <Link href="/editor" onClick={() => setIsMobileMenuOpen(false)}>
                      <p className="text-[16px] hover:underline ml-4 hover:text-blue-600">Editor</p>
                    </Link>
                    <Link href="/keywordcombiner" onClick={() => setIsMobileMenuOpen(false)}>
                      <p className="text-[16px] hover:underline ml-4 hover:text-blue-600">Keyword Combiner</p>
                    </Link>
                  </div>
                </>
              )}

              {/* PMax Mobile */}
              <Link href="/pmax" onClick={() => setIsMobileMenuOpen(false)}>
                <p className="text-[18px] hover:underline">PMax</p>
              </Link>

              {/* User Account Mobile */}
              {currentUser && (
                <div className="border-t border-gray-300 pt-2">
                  <p className="text-[16px] font-semibold text-gray-600">User Account</p>
                  <Link href="/account" onClick={() => setIsMobileMenuOpen(false)}>
                    <p className="text-[16px] hover:underline ml-4 hover:text-blue-600">My Account</p>
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOutClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-[16px] hover:underline ml-4 text-left hover:text-red-600"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        setUserStatus={setUserStatus}
        onSuccess={() => {
          // After successful login, redirect to account page
          if (currentUser) {
            router.push('/account');
          }
        }}
      />
    </>
  );
}