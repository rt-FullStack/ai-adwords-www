"use client";
import { useState } from "react";
import { FaPlus, FaMinus } from "react-icons/fa";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "What is AdSaver.org, and how can it help with my Google Ads campaigns?",
      answer: (
        <>
          AdSaver.org is an AI-powered platform designed to optimize your Google Ads campaigns effortlessly.
          It helps you save time, boost efficiency, and achieve better results through intuitive tools.
          By leveraging AI, AdSaver enables smarter decision-making and gives you full control over your advertising.
          To get started with creating campaigns, ads, and keyword combinations, check out the tutorials on {" "}
          <a
            href="https://www.youtube.com/@ADsaverorg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4C84EC] hover:underline"
          >
           &nbsp; AdSaver&apos;s YouTube channel
          </a>.
        </>
      )
    },
    {
      question: "How do I create effective campaigns and ads using AdSaver?",
      answer: (
        <>
          AdSaver simplifies campaign creation with AI-driven insights and user-friendly tools.
          You can set up campaigns, craft compelling ads, and select optimized keyword combinations
          to reach your target audience. For step-by-step guidance, refer to the tutorials on creating campaigns and ads on{" "}
          <a
            href="https://www.youtube.com/@ADsaverorg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4C84EC] hover:underline"
          >
           &nbsp; AdSaver&apos;s YouTube channel
          </a>.
        </>
      )
    },
    {
      question: "Can I import existing Google Ads accounts into AdSaver?",
      answer: (
        <>
          Yes, AdSaver allows you to import your existing Google Ads accounts seamlessly, so you can optimize and manage them within the platform.
          Learn how to import accounts efficiently by watching the dedicated tutorial on {" "}
          <a
            href="https://www.youtube.com/@ADsaverorg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4C84EC] hover:underline"
          >
           &nbsp; AdSaver&apos;s YouTube channel
          </a>.
        </>
      )
    },
    {
      question: "How does AdSaver help with keyword optimization?",
      answer: (
        <>
          AdSaver's AI tools analyze and suggest keyword combinations to maximize your campaign's performance and reach.
          It helps you identify high-performing keywords and avoid irrelevant ones, ensuring cost-effective ads.
          For tips on creating keyword combinations, explore the tutorials on {" "}
          <a
            href="https://www.youtube.com/@ADsaverorg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4C84EC] hover:underline"
          >
           &nbsp; AdSaver&apos;s YouTube channel
          </a>.
        </>
      )
    },
    {
      question: "How can I get started with AdSaver and see results?",
      answer: (
        <>
          To elevate your Google Ads game, sign up for AdSaver and explore its intuitive interface.
          Use the AI-powered tools to create, optimize, and manage your campaigns.
          For a detailed walkthrough on setting up your first campaign and achieving better results, visit {" "}
          <a
            href="https://www.youtube.com/@ADsaverorg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4C84EC] hover:underline"
          >
           &nbsp; AdSaver&apos;s YouTube channel
          </a> &nbsp; for comprehensive tutorials.
        </>
      )
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div
      className="max-w-4xl mx-auto py-16 px-6"
      id="faq">
      <h3 className="text-gray-500 uppercase text-center text-sm">FAQ</h3>
      <h2 className="text-4xl font-bold text-center mb-4">Frequently asked questions</h2>
      <p className="text-center text-gray-600 mb-10">Have questions? We're here to help.</p>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border-b border-gray-300">
            <button
              className="flex justify-between items-center w-full py-4 font-semibold text-left text-lg"
              onClick={() => toggleFAQ(index)}>
              {faq.question}
              {openIndex === index ? <FaMinus className="text-xl" /> : <FaPlus className="text-xl" />}
            </button>
            {openIndex === index && (
              <p
                className="text-left text-gray-600 pb-4 bg-white"
                style={{ borderRadius: "10px", padding: "10px" }}>
                {faq.answer}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;