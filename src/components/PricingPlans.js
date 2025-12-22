"use client";
import React, { useState } from "react";
import Button from "@/components/buttons";
import PurchaseModal from "./PurchaseModal";

const PricingPlans = () => {
  const aiSlotPackages = [
    {
      name: "25 slots",
      price: "495 SEK",
      slots: "25",
      description: "Add 25 AI slots to your subscription",
    },
    {
      name: "50 slots",
      price: "895 SEK",
      slots: "50",
      description: "Add 50 AI slots to your subscription",
    },
    {
      name: "100 slots",
      price: "1 495 SEK",
      slots: "100",
      description: "Add 100 AI slots to your subscription",
    },
    {
      name: "200 slots",
      price: "2 494 SEK",
      slots: "200",
      description: "Add 200 AI slots to your subscription",
    },
  ];

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseType, setPurchaseType] = useState("subscription");
  const [selectedSlotPackage, setSelectedSlotPackage] = useState(aiSlotPackages[0]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      name: "Standard License",
      price: "1 950 SEK per month",
      period: "month",
      description: "Save 90% time on your ad creation with AI-driven tools, crafting high-impact Google Ads campaigns tailored to your goals boosting ROI.",
      features: ["Access to AI Ad Editor", "1 concurrent session", "25 AI slots", "Basic support"],
      type: "standard",
    },
    {
      name: "Pro License",
      price: "2 995 SEK per month",
      period: "month",
      description: "Save 90% time on your ad creation with AI-driven tools, crafting high-impact Google Ads campaigns tailored to your goals boosting ROI.",
      features: ["Access to AI Ad Editor", "2 concurrent sessions", "100 AI slots", "Priority support"],
      type: "pro",
    },
    {
      name: "Enterprise License",
      price: "19 990 SEK per month",
      period: "month",
      description: "Save 90% time on your ad creation with AI-driven tools, crafting high-impact Google Ads campaigns tailored to your goals boosting ROI.",
      features: ["Access to AI Ad Editor", "10 concurrent sessions", "200 AI slots", "2h free support", "Custom solutions"],
      type: "enterprise",
    },
  ];

  const handlePlanClick = (type, selectedPackage = null) => {
    setPurchaseType(type);
    if (type === "subscription") {
      setSelectedPlan(selectedPackage);
    }
    setShowPurchaseModal(true);
  };

  const handleSlotPackageChange = (e) => {
    const selected = aiSlotPackages.find((pkg) => pkg.slots === e.target.value);
    setSelectedSlotPackage(selected);
  };

  return (
    <div
      className="flex flex-col items-center justify-center mt-20 font-nunito"
      id="pricing">
      <h2 className="text-4xl font-bold text-center mb-4">Choose your plan</h2>
      <p className="text-gray-600 text-center mb-10 max-w-2xl">
        Select from the best plans, ensuring a perfect match. Need more or less? Customize your subscription for a seamless fit!
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {plans.map((plan, index) => (
          <div
            key={index}
            className="border rounded-xl shadow-lg p-6 w-96 lg:w-80 text-center bg-gray-100 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] hover:shadow-xl cursor-pointer"
            onClick={() => handlePlanClick("subscription", plan)}>
            <div>
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-gray-600 mb-4">{plan.description}</p>
              <h4 className="text-3xl font-bold mb-2">{plan.price}</h4>
              <ul className="text-left mb-4">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2">
                    <span>✔</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              title="Get started"
              color="dark"
              style={{ width: "270px", display: "block", margin: "0 auto" }}
            />
          </div>
        ))}
      </div>

      {/* AI Slot Packages */}
      <div className="flex flex-col items-center justify-center mt-20 font-nunito">
        <h2 className="text-4xl font-bold text-center mb-4">Additional AI Slots</h2>
        <p className="text-gray-500 text-center mb-10 max-w-2xl">
          Need more AI slots? Choose from our flexible packages to expand your capabilities.
        </p>

        <div className="flex justify-center">
          <div className="border rounded-xl shadow-lg p-8 w-96 text-center bg-gray-100 flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-4">AI Slot Package</h3>
              <div className="mb-6">
                <label htmlFor="slotPackage" className="sr-only">
                  Choose a slot package
                </label>
                <select
                  id="slotPackage"
                  className="w-full p-3 rounded-lg border border-gray-300 bg-white text-gray-700 text-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  value={selectedSlotPackage.slots}
                  onChange={handleSlotPackageChange}>
                  {aiSlotPackages.map((pkg) => (
                    <option
                      key={pkg.slots}
                      value={pkg.slots}>
                      {pkg.slots} slots - {pkg.price}
                    </option>
                  ))}
                </select>
              </div>
              <h4 className="text-3xl font-bold mb-4">{selectedSlotPackage.price}</h4>
              <ul className="text-left mb-6 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✔</span> {selectedSlotPackage.slots} AI slots
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✔</span> One-time purchase
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✔</span> Instant activation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✔</span> No expiration
                </li>
              </ul>
            </div>
            <Button
              title="Purchase slots"
              color="dark"
              style={{ width: "100%", display: "block", margin: "0 auto" }}
              onClick={() => handlePlanClick("ai_slots", selectedSlotPackage)}
            />
          </div>
        </div>
      </div>

      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        type={purchaseType}
        selectedPackage={purchaseType === "ai_slots" ? selectedSlotPackage : selectedPlan}
      />
    </div>
  );
};

export default PricingPlans;
