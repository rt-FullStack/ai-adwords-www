"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Modal from "@/components/modal";
import dynamic from "next/dynamic";

import Button from "@/components/buttons";
import Link from "next/link";
import { useAuth } from "@/components/authContext";
import PaymentModal from "@/components/paymentModal";
import "../app/globals.css";
import FAQ from "@/components/FAQ";
import PricingPlans from "@/components/PricingPlans";

// Dynamically import Animation with no SSR
const Animation = dynamic(() => import("@/components/animation"), { ssr: false });

export default function Home() {
  const animationRef = useRef(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [showPaymentDueToSignIn, setShowPaymentDueToSignIn] = useState(false);

  const { currentUser, showPaymentModal, setShowPaymentModal } = useAuth();

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const openModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (currentUser && showPaymentDueToSignIn) {
      setShowPaymentModal(true);
      setShowPaymentDueToSignIn(false);
    }
  }, [currentUser, showPaymentDueToSignIn, setShowPaymentModal]);

  useEffect(() => {
    const scrollToId = sessionStorage.getItem("scrollToId");
    if (scrollToId) {
      const element = document.getElementById(scrollToId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        sessionStorage.removeItem("scrollToId");
      }
    }
  }, []);

  return (
    <div className="">
      <div className="flex flex-col items-center justify-center mt-20 font-nunito">
        <div className="max-w-3xl text-center">
          <h1
            className="font-bold text-6xl pb-10 leading-relaxed"
            style={{
              fontFamily: "'__Roboto_22ceb1', sans-serif",
              lineHeight: "1",
              fontWeight: "700",
              fontSize: "80px",
            }}>
            Master your Google Ads with AdSaver
          </h1>
          <p
            className="text-lg leading-relaxed mb-10"
            style={{
              fontFamily: "open-sans, sans-serif",
              lineHeight: "40px",
              fontSize: "25px",
              fontWeight: "400",
              textAlign: "left",
            }}>
            Unlock the power of AI to optimize your campaigns effortlessly. Save time, boost efficiency, and achieve better results with our
            intuitive tools. Make smarter decisions and take full control of your advertising. Ready to elevate your Google Ads game? Try
            AdSaver now and see the difference!
          </p>
          <div className="flex gap-4 justify-center">
            {!currentUser ? (
              <>
                <Button
                  size="medium"
                  color="dark"
                  onClick={() => {
                    openModal();
                    setShowPaymentDueToSignIn(true);
                  }}
                  title="Sign in"
                />
                <Link href="/getStarted">
                  <Button
                    title="Try demo"
                    color="light"
                    size="medium"
                  />
                </Link>
              </>
            ) : (
              <Link href="/client">
                <Button
                  title="Go to Editor"
                  color="dark"
                  size="medium"
                />
              </Link>
            )}
          </div>

          <Modal
            isOpen={isModalOpen}
            onClose={closeModal}
          />
          {showPaymentModal && <PaymentModal />}

          <PricingPlans />
          <FAQ />
        </div>
      </div>
    </div>
  );
}