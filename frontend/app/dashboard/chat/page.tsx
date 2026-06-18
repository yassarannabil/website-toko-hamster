"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import HamsterImage from "../../components/HamsterImage";
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
  media_url?: string;
  media_type?: string;
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Rooms
  const fetchRooms = async () => {
    try {
      const res = await fetch(`/api/dashboard/chat/rooms/`);
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
      const res = await fetch(`/api/dashboard/chat/rooms/${activeRoom.room_id}/messages/`);
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
    }, 10000); // Polling setiap 10 detik
    return () => clearInterval(interval);
  }, [activeRoom]);

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error("Konfigurasi Cloudinary tidak ditemukan di frontend.");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: fd
    });
    if (!res.ok) {
      throw new Error(`Cloudinary error: ${res.status}`);
    }
    const data = await res.json();
    return data.secure_url;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !activeRoom) return;

    setIsUploading(true);
    let mediaUrl = "";
    let mediaType = "";
    
    try {
      if (selectedFile) {
        mediaUrl = await uploadToCloudinary(selectedFile);
        mediaType = selectedFile.type.startsWith("video") ? "video" : "image";
      }

      const payload = {
        message: newMessage,
        media_url: mediaUrl,
        media_type: mediaType
      };

      setNewMessage("");
      setSelectedFile(null);

      const res = await fetch(`/api/dashboard/chat/rooms/${activeRoom.room_id}/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchMessages();
        fetchRooms();
      }
    } catch (err) {
      alert("Gagal mengirim pesan atau mengunggah file.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const renderProductCard = (inv: any) => (
    <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm mb-2 w-[260px] sm:w-[280px] cursor-pointer hover:bg-gray-50 transition-colors">
      <div className="w-14 h-14 min-w-[56px] min-h-[56px] bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
        <HamsterImage 
          src={inv.foto_preview} 
          alt={inv.varian} 
          className="absolute inset-0 w-full h-full object-cover" 
        />
      </div>
      <div className="flex flex-col justify-center text-left text-gray-800 min-w-0 flex-1">
        <span className="text-[10px] font-bold text-brand-500 truncate">{inv.kode_hamster}</span>
        <span className="text-sm font-bold truncate">{inv.varian}</span>
        <span className="text-xs font-bold text-gray-500 mt-0.5">{formatRupiah(inv.harga)}</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-100px)] sm:h-[calc(100dvh-116px)] md:h-[calc(100dvh-64px)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Sidebar List Chat */}
      <aside className="w-80 border-r border-gray-100 flex flex-col bg-[#fdfcfb]">
        <div className="p-4 border-b border-gray-100 flex items-center h-[76px]">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pesan Pelanggan</h1>
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
            <header className="bg-white p-4 border-b border-gray-100 flex items-center shadow-sm h-[76px]">
              <button 
                onClick={() => setActiveRoom(null)}
                className="mr-3 p-2 -ml-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                title="Tutup Obrolan"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold mr-3 flex-shrink-0">
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
                    
                    {/* Media Attachment */}
                    {msg.media_url && (
                      <div className={`mb-1 ${msg.sender_is_admin ? "self-end" : "self-start"} overflow-hidden rounded-xl shadow-sm border border-gray-100 max-w-[200px] sm:max-w-[250px]`}>
                        {msg.media_type === "video" ? (
                          <video controls src={msg.media_url} className="w-full h-auto object-cover max-h-[300px]" />
                        ) : (
                          <img src={msg.media_url} alt="Attachment" className="w-full h-auto object-cover max-h-[300px]" />
                        )}
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
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <div className={`text-[10px] mt-1 text-right ${msg.sender_is_admin ? "text-orange-100" : "text-gray-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                    {!msg.message && msg.media_url && (
                      <div className={`text-[10px] mt-1 text-right ${msg.sender_is_admin ? "text-gray-400" : "text-gray-400"}`}>
                        {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="bg-white p-4 border-t border-gray-100 flex flex-col">
              {/* File Preview */}
              {selectedFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 rounded-lg max-w-xs relative self-start">
                  <span className="text-xs truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 font-bold ml-auto px-2 hover:bg-gray-200 rounded"
                  >
                    ✕
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                <input 
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors flex-shrink-0"
                  title="Lampirkan File"
                >
                  📎
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ketik balasan untuk pelanggan..."
                  className="flex-1 bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#ea8b3a]/30 h-12"
                />
                <button 
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                  className={`px-6 h-12 text-white font-bold rounded-xl transition-colors flex-shrink-0 ${isUploading ? 'bg-gray-400 cursor-wait' : 'bg-[#ea8b3a] hover:bg-[#dc7030] disabled:opacity-50'}`}
                >
                  {isUploading ? 'Mengirim...' : 'Kirim'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-5xl mb-4"></span>
            <p className="text-lg">Pilih pesan di samping untuk membalas pelanggan.</p>
          </div>
        )}
      </main>
    </div>
  );
}
