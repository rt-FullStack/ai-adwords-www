// components/Logo/Logo.js
import Link from "next/link";
import Image from "next/image";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-3 ml-6">
      {/* If you have a logo image */}
      { <Image 
        src="/adSaver.png" 
        alt="AI-ADWORDS" 
        width={60} 
        height={60}
       
      /> }
      
      {/* Company name - changed from AdSaver to AI-ADWORDS */}
      <div className="flex flex-col">
        <span 
          className="text-2xl font-bold text-gray-800"
          style={{ 
            fontSize: '25px', 
            fontWeight: 'bold',
            color: '#1a365d'
          }}
        >
          AI-ADWORDS
        </span>
      </div>
    </Link>
  );
}