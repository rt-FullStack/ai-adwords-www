"use client";
import React, { useEffect, useRef } from "react";
import lottie from "lottie-web";
import AnimationData from "/src/assets/animation.json";

export default function Animation() {
  const animationContainer = useRef(null);

  useEffect(() => {
    const animation = lottie.loadAnimation({
      container: animationContainer.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: AnimationData,
    });
    animation.setSpeed(0.5);

    return () => {
      animation.destroy();
    };
  }, []); // Removed AnimationData dependency

  return <div className="opacity-80" ref={animationContainer}></div>;
}