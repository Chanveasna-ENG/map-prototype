import React from "react";
import Link from "next/link";

export default function Home(): React.ReactNode {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 font-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-purple-600/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none" />

      <main className="z-10 flex flex-col items-center text-center max-w-4xl gap-8 animate-in fade-in zoom-in duration-1000">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-sm font-medium text-zinc-300 backdrop-blur-md shadow-lg transition-transform hover:scale-105 cursor-default">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Map System Online
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent drop-shadow-sm">
          Campus Navigation
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Interactive school map infrastructure. Choose your operating mode to continue.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          <Link 
            href="/kiosk" 
            className="px-8 py-4 rounded-xl bg-white text-black font-semibold tracking-wide hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]"
          >
            Open User Kiosk
          </Link>
          <Link 
            href="/edit" 
            className="px-8 py-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-semibold tracking-wide hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 backdrop-blur-md"
          >
            Admin Editor
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-8 text-zinc-600 text-sm font-medium tracking-wide">
        Powered by Next.js &middot; Designed for the future
      </footer>
    </div>
  );
}
