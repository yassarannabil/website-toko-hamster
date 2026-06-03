"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../../data/hamsters";
import Link from "next/link";

interface Room {
  room_id: number;
  customer_name: string;
  unread_count: number;
  last_updated: string;
}

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

export default function AdminChatDashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Rooms
  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/chat/rooms/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRooms(data);
        } else {
          setRooms([]);
        }
      }
    } catch (err) {}
  };

  // Fetch Messages for active room
  const fetchMessages = async () => {
    if (!activeRoom) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/chat/rooms/${activeRoom.room_id}/messages/`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {}
  };

  // Polling setup
  useEffect(() => {
    fetchRooms();
    fetchMessages();
    const interval = setInterval(() => {
      fetchRooms();
      fetchMessages();
    }, 3000); // Polling setiap 3 detik
    return () => clearInterval(interval);
  }, [activeRoom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;

    const msgToSend = newMessage;
    setNewMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/chat/rooms/${activeRoom.room_id}/messages/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: msgToSend })
      });
      if (res.ok) {
        fetchMessages();
        fetchRooms();
      }
    } catch (err) {}
  };

  const renderProductCard = (inv: any) => (
    <div className="bg-white border border-gray-100 rounded-xl p-3 flex gap-3 shadow-sm mb-2 max-w-sm w-full cursor-pointer hover:bg-gray-50 transition-colors">
      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        {inv.foto_preview ? (
          <img src={inv.foto_preview} alt={inv.varian} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🐹</div>
        )}
      </div>
      <div className="flex flex-col justify-center text-left text-gray-800">
        <span className="text-[10px] font-bold text-brand-500">{inv.kode_hamster}</span>
        <span className="text-sm font-bold line-clamp-1">{inv.varian}</span>
        <span className="text-xs font-bold text-gray-500 mt-0.5">{formatRupiah(inv.harga)}</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar List Chat */}
      <aside className="w-80 border-r border-gray-100 flex flex-col bg-[#fdfcfb]">
        <div className="p-4 border-b border-gray-100">
          <Link href="/dashboard" className="text-sm font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-2 mb-4">
            <span>←</span> Kembali ke Dashboard
          </Link>
          <h2 className="text-xl font-bold text-gray-800">Pesan Pelanggan</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Belum ada pesan masuk.</div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.room_id}
                onClick={() => { setActiveRoom(room); setMessages([]); }}
                className={`w-full text-left p-4 border-b border-gray-50 transition-colors ${
                  activeRoom?.room_id === room.room_id ? "bg-orange-50" : "hover:bg-white"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-800">{room.customer_name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(room.last_updated).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-500 truncate pr-4">Ketuk untuk membalas...</span>
                  {room.unread_count > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {room.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col bg-gray-50/50">
        {activeRoom ? (
          <>
            <header className="bg-white p-4 border-b border-gray-100 flex items-center shadow-sm">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold mr-3">
                {activeRoom.customer_name.charAt(0).toUpperCase()}
              </div>
              <h2 className="font-bold text-lg text-gray-800">{activeRoom.customer_name}</h2>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender_is_admin ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex flex-col max-w-[85%] md:max-w-[70%]">
                    {/* Product Context in Message */}
                    {msg.related_inventory && (
                      <div className={`mb-1 ${msg.sender_is_admin ? "self-start" : "self-end"}`}>
                        {renderProductCard(msg.related_inventory)}
                      </div>
                    )}
                    
                    {/* Text Bubble */}
                    {msg.message && (
                      <div 
                        className={`p-3.5 rounded-2xl text-sm shadow-sm ${
                          msg.sender_is_admin 
                            ? "bg-[#ea8b3a] text-white rounded-tr-none self-end" 
                            : "bg-white text-gray-800 rounded-tl-none border border-gray-100 self-start"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <div className={`text-[10px] mt-1 text-right ${msg.sender_is_admin ? "text-orange-100" : "text-gray-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <footer className="bg-white p-4 border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ketik balasan untuk pelanggan..."
                  className="flex-1 bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#ea8b3a]/30"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-3 bg-[#ea8b3a] text-white font-bold rounded-xl hover:bg-[#dc7030] disabled:opacity-50"
                >
                  Kirim
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-5xl mb-4">📨</span>
            <p className="text-lg">Pilih pesan di samping untuk membalas pelanggan.</p>
          </div>
        )}
      </main>
    </div>
  );
}
