"use client";

import React, { useEffect } from 'react';
import { useConfigStore } from '@/stores/useConfigStore';
import { useMappingStore } from '@/stores/useMappingStore';
import axios from 'axios';
import { Bell, User, Search, LayoutDashboard, FileText, UserCheck, Download, Zap } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setMetadata = useConfigStore((state) => state.setMetadata);
  const { mappings, workflowStatus } = useMappingStore();
  const pathname = usePathname();

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [contextRes, attrRes, workflowRes] = await Promise.all([
          axios.get('http://localhost:8001/api/metadata/business-context'),
          axios.get('http://localhost:8001/api/metadata/attributes'),
          axios.get('http://localhost:8001/api/metadata/workflow')
        ]);
        
        setMetadata({
          ...contextRes.data,
          attributeCatalog: attrRes.data,
          workflowStages: workflowRes.data.workflowStages
        });
      } catch (error) {
        console.error("Failed to fetch metadata", error);
      }
    };
    fetchMetadata();
  }, [setMetadata]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <div className="min-h-screen bg-[#F8FAFC]">
          {/* Header */}
          <header className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-50">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-slate-900">PartnerScale AI</span>
              </div>
              
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  href="/" 
                  className={cn(
                    "text-sm font-medium flex items-center gap-2 transition-colors",
                    pathname === '/' ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>

                <Link 
                  href="/review" 
                  className={cn(
                    "text-sm font-medium flex items-center gap-2 transition-colors",
                    pathname === '/review' ? "text-blue-600" : 
                    mappings.length > 0 ? "text-slate-500 hover:text-slate-900" : "text-slate-300 cursor-not-allowed pointer-events-none"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Review
                </Link>

                <Link 
                  href="/approve" 
                  className={cn(
                    "text-sm font-medium flex items-center gap-2 transition-colors",
                    pathname === '/approve' ? "text-blue-600" : 
                    workflowStatus === 'pending' || workflowStatus === 'approved' ? "text-slate-500 hover:text-slate-900" : "text-slate-300 cursor-not-allowed pointer-events-none"
                  )}
                >
                  <UserCheck className="w-4 h-4" />
                  Approve
                </Link>

                <Link 
                  href="/export" 
                  className={cn(
                    "text-sm font-medium flex items-center gap-2 transition-colors",
                    pathname === '/export' ? "text-blue-600" : 
                    workflowStatus === 'approved' ? "text-slate-500 hover:text-slate-900" : "text-slate-300 cursor-not-allowed pointer-events-none"
                  )}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search mappings..." 
                  className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden cursor-pointer border border-slate-300">
                <User className="w-full h-full p-1.5 text-slate-600" />
              </div>
            </div>
          </header>

          <main className="p-8 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
