import Link from "next/link";
import Footer from "./components/Footer";
import { getRelativeMediaUrl } from "./data/hamsters";

export default function GatewayPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* ───── Hero ───── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 flex-1 flex items-center justify-center">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-brand-400/15 blur-3xl" />

        <div className="relative mx-auto max-w-md px-6 py-16 text-center sm:py-20">
          {/* Logo — taruh file di frontend/public/logo-noska.png */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-sm shadow-xl shadow-brand-900/30 overflow-hidden sm:h-24 sm:w-24">
            <img
              src="/logo-noska.png"
              alt="Noska Hamster"
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Noska Hamster
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-brand-100/90 sm:text-base sm:mt-4">
            Pilih menu di bawah untuk lanjut
          </p>

          {/* ───── Gateway Cards ───── */}
          <div className="mt-10 flex flex-col gap-4 max-w-sm mx-auto">
            {/* Card: Katalog (ATAS) */}
            <Link
              href="/katalog"
              className="group flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-7 text-brand-900 shadow-xl shadow-brand-900/10 transition-all duration-200 hover:bg-white/95 hover:shadow-2xl hover:shadow-brand-900/20 hover:-translate-y-1 active:scale-[0.97]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 shadow-inner overflow-hidden">
                <img
                  src="/icon-katalog.png"
                  alt="Katalog"
                  className="h-9 w-9 object-contain opacity-90 transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="text-center">
                <span className="block text-base font-bold text-gray-900">Lihat Katalog</span>
                <span className="block text-xs text-gray-500 font-medium">Lihat koleksi hamster kami</span>
              </div>
            </Link>

            {/* Card: Cek Ongkir (TENGAH) */}
            <Link
              href="/cek-ongkir"
              className="group flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-7 text-brand-900 shadow-xl shadow-brand-900/10 transition-all duration-200 hover:bg-white/95 hover:shadow-2xl hover:shadow-brand-900/20 hover:-translate-y-1 active:scale-[0.97]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 shadow-inner overflow-hidden">
                <img
                  src="/icon-ongkir.png"
                  alt="Cek Ongkir"
                  className="h-9 w-9 object-contain opacity-90 transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="text-center">
                <span className="block text-base font-bold text-gray-900">Cek Ongkir</span>
                <span className="block text-xs text-gray-500 font-medium">Cek estimasi biaya pengiriman</span>
              </div>
            </Link>

            {/* Card: Keranjang (BARU) */}
            <Link
              href="/cart"
              className="group flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-7 text-brand-900 shadow-xl shadow-brand-900/10 transition-all duration-200 hover:bg-white/95 hover:shadow-2xl hover:shadow-brand-900/20 hover:-translate-y-1 active:scale-[0.97]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 shadow-inner overflow-hidden">
                <span className="text-2xl"></span>
              </div>
              <div className="text-center">
                <span className="block text-base font-bold text-gray-900">Keranjang Belanja</span>
                <span className="block text-xs text-gray-500 font-medium">Checkout pesanan hamster Anda</span>
              </div>
            </Link>

            {/* Card: Chat Admin (PENGGANTI WA) */}
            <Link
              href="/chat"
              className="group flex flex-col items-center gap-3 rounded-2xl bg-wa-green/90 px-6 py-7 text-white shadow-lg shadow-wa-green/30 backdrop-blur-sm transition-all duration-200 hover:bg-wa-green hover:shadow-xl hover:shadow-wa-green/40 hover:-translate-y-1 active:scale-[0.97]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <span className="text-2xl"></span>
              </div>
              <div className="text-center">
                <span className="block text-base font-bold text-white">Live Chat</span>
                <span className="block text-xs text-white/80 font-medium">Chat langsung dengan admin kami</span>
              </div>
            </Link>
          </div>
        </div>

        <svg
          className="absolute bottom-0 left-0 w-full text-surface"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,60 L0,60 Z" />
        </svg>
      </header>

      <Footer />
    </div>
  );
}
