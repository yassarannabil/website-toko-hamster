import Link from "next/link";
import Footer from "./components/Footer";
import { WHATSAPP_NUMBER } from "./data/hamsters";

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

            {/* Card: WhatsApp (BAWAH) */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 rounded-2xl bg-wa-green/90 px-6 py-7 text-white shadow-lg shadow-wa-green/30 backdrop-blur-sm transition-all duration-200 hover:bg-wa-green hover:shadow-xl hover:shadow-wa-green/40 hover:-translate-y-1 active:scale-[0.97]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div className="text-center">
                <span className="block text-base font-bold text-white">WhatsApp</span>
                <span className="block text-xs text-white/80 font-medium">Langsung chat untuk transaksi</span>
              </div>
            </a>
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
