"use client";

import Link from 'next/link';
import { useMetaMask } from "../hooks/useMetaMask";

export function Navbar() {
  const { isConnected, connect, address, chainId } = useMetaMask();

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xl">📄</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ChainResume
          </span>
        </Link>
        
        <div className="flex items-center gap-6">
          {isConnected && (
            <>
              <Link 
                href="/create" 
                className="text-gray-600 hover:text-blue-600 font-medium transition hidden sm:block"
              >
                创建简历
              </Link>
              <Link 
                href="/my" 
                className="text-gray-600 hover:text-blue-600 font-medium transition hidden sm:block"
              >
                我的简历
              </Link>
              <Link 
                href="/fhe-demo" 
                className="text-gray-600 hover:text-blue-600 font-medium transition hidden sm:block"
              >
                🔐 FHE 演示
              </Link>
            </>
          )}
          
          <div className="flex items-center gap-3">
            {chainId && (
              <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600 font-medium hidden sm:block">
                Chain: {chainId}
              </div>
            )}
            {!isConnected ? (
              <button
                onClick={connect}
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
              >
                连接钱包
              </button>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
