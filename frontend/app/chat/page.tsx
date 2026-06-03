"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getToken, isAuthenticated } from "../utils/auth";
import { API_BASE_URL } from "../data/hamsters";

interface Message {
  id: number;
  message: string;
  sender_is_admin: boolean;
  is_read: boolean;
  created_at: string;
  related_inventory?: {
    inventory_id: number;
    kode_hamster: string;
    varian: string;
    harga: number;
    foto_preview: string | null;
  } | null;
}

function formatRupiah(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  const formatted = Math.round(num).toLocaleString("id-ID").replace(/,/g, ".");
  return `Rp ${formatted}`;
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inventoryId = searchParams.get("inventory_id");

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomId, setRoomId] = useState<number | null>(null);
  const [relatedProduct, setRelatedProduct] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch product context if present in URL
  useEffect(() => {
    if (inventoryId && isAuthenticated()) {
      fetch(`${API_BASE_URL}/api/store/inventory/${inventoryId}/`, {
        headers: { "Authorization": `Token ${getToken()}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && !data.error) {
          setRelatedProduct(data);
        }
      });
    }
  }, [inventoryId]);

  // Fetch Room & Messages
  const fetchMessages = async () => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    try {
      let currentRoomId = roomId;
      if (!currentRoomId) {
        const roomRes = await fetch(`${API_BASE_URL}/api/chat/rooms/`, {
          headers: { "Authorization": `Token ${getToken()}` }
        });
        if (!roomRes.ok) return;
        const roomData = await roomRes.json();
        currentRoomId = roomData.room_id;
        setRoomId(currentRoomId);
      }
      if (currentRoomId) {
        const msgRes = await fetch(`${API_BASE_URL}/api/chat/rooms/${currentRoomId}/messages/`, {
          headers: { "Authorization": `Token ${getToken()}` }
        });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !relatedProduct) return;
    if (!roomId) return;

    const payload = {
      message: newMessage,
      inventory_id: relatedProduct ? relatedProduct.inventory_id : null
    };

    setNewMessage(""); 
    setRelatedProduct(null); // Clear context after sending

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/rooms/${roomId}/messages/`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchMessages();
        // Remove query parameter
        router.replace("/chat", { scroll: false });
      }
    } catch (err) {
      alert("Gagal mengirim pesan.");
    }
  };

  const renderProductCard = (inv: any) => (
    <div className="bg-white border border-gray-100 rounded-xl p-3 flex gap-3 shadow-sm mb-2 max-w-sm w-full cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push("/katalog")}>
      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        {inv.foto_preview ? (
          <img src={inv.foto_preview} alt={inv.varian} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🐹</div>
        )}
      </div>
      <div className="flex flex-col justify-center text-left">
        <span className="text-[10px] font-bold text-brand-500">{inv.kode_hamster}</span>
        <span className="text-sm font-bold text-gray-800 line-clamp-1">{inv.varian}</span>
        <span className="text-xs font-bold text-gray-500 mt-0.5">{formatRupiah(inv.harga)}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ea8b3a] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm">
            N
          </div>
          <div>
            <h1 className="font-bold text-gray-800 leading-tight">Admin Noska Hamster</h1>
            <p className="text-xs text-green-500 font-medium">Online</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-4xl mb-3">💬</span>
            <p>Mulai obrolan dengan admin.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_is_admin ? "justify-start" : "justify-end"}`}>
              <div className="flex flex-col max-w-[85%] md:max-w-[70%]">
                {/* Product Context in Message */}
                {msg.related_inventory && (
                  <div className={`mb-1 ${msg.sender_is_admin ? "self-start" : "self-end"}`}>
                    {renderProductCard(msg.related_inventory)}
                  </div>
                )}
                
                {/* Text Bubble */}
                {msg.message && (
                  <div className={`p-3.5 rounded-2xl shadow-sm text-sm ${
                    msg.sender_is_admin 
                      ? "bg-white text-gray-800 rounded-tl-none border border-gray-100 self-start" 
                      : "bg-[#ea8b3a] text-white rounded-tr-none self-end"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <div className={`text-[10px] mt-1.5 text-right ${msg.sender_is_admin ? "text-gray-400" : "text-white/80"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="bg-white p-4 border-t border-gray-100 pb-8 md:pb-4 relative">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Product Preview before sending */}
          {relatedProduct && (
            <div className="flex items-center gap-2 mb-2 relative">
              <button 
                type="button"
                onClick={() => {
                  setRelatedProduct(null);
                  router.replace("/chat", { scroll: false });
                }}
                className="absolute -top-2 -right-2 z-10 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-200"
              >
                ✕
              </button>
              {renderProductCard(relatedProduct)}
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={relatedProduct ? "Tanyakan sesuatu tentang produk ini..." : "Ketik pesan Anda di sini..."}
              className="flex-1 bg-gray-100 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-[#ea8b3a]/30 transition-all text-sm"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim() && !relatedProduct}
              className="w-12 h-12 bg-[#ea8b3a] hover:bg-[#dc7030] rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Memuat obrolan...</div>}>
      <ChatContent />
    </Suspense>
  );
}
