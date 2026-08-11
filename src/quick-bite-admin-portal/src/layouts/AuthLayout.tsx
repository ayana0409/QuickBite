import { Outlet } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Header logo */}
      <header className="w-full max-w-md mx-auto flex items-center justify-center gap-3 py-4 z-10">
        <div className="p-2.5 bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 rounded-xl text-slate-950 shadow-lg shadow-amber-500/20">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-orange-300 to-pink-400 bg-clip-text text-transparent">
            QUICKBITE PORTAL
          </h1>
          <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">
            Admin & Merchant Management System
          </p>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="w-full max-w-md mx-auto my-auto z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-3 text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} QuickBite Microservices Ecosystem. All rights reserved.
      </footer>
    </div>
  );
}
