"use client";

import "./globals.css";
import { ReactNode } from "react";
import { Navbar } from "../components/Navbar";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <title>ChainResume - 去中心化简历平台</title>
        <meta name="description" content="使用 FHEVM 加密技术的去中心化简历平台" />
      </head>
      <body>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
