
"use client";

import { useState, useEffect } from "react";
import AddressInput from "../components/AddressInput";

export default function Home() {
  const [input, setInput] = useState("");
  const [addresses, setAddresses] = useState<any[]>([]);

  // 读取本地存储
  useEffect(() => {
    const saved = localStorage.getItem("addresses");
    if (saved) {
      try {
        setAddresses(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // 保存到本地存储
  useEffect(() => {
    localStorage.setItem("addresses", JSON.stringify(addresses));
  }, [addresses]);

  const getMapsUrl = (desc: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(desc)}`;
  };

  // 删除地址
  const handleDelete = (idx: number) => {
    setAddresses(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="h-screen flex flex-col items-center bg-gray-50 p-4 overflow-auto">
      <div className="w-full max-w-md bg-white rounded shadow p-6 flex flex-col gap-4">
        <h1 className="text-xl font-bold mb-2">Enter Address</h1>
        <AddressInput
          value={input}
          onChange={setInput}
          onSelect={place => {
            if (place && place.description) {
              setAddresses(prev => [...prev, place]);
              setInput("");
            }
          }}
        />
        {addresses.length > 0 && (
          <div className="flex flex-col gap-2 mt-4">
            {addresses.map((addr, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <a
                  href={getMapsUrl(addr.description)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-100 text-blue-900 py-2 rounded text-center font-medium hover:bg-blue-200 transition block select-none"
                >
                  {addr.description}
                </a>
                <button
                  onClick={() => handleDelete(idx)}
                  className="bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 transition text-sm"
                  style={{ minWidth: 0 }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
