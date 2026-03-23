'use client'

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* App Title */}
      <h1
        className="text-4xl font-bold mb-2 text-black"
        style={{ fontFamily: '"Google Sans Code", Inter, Helvetica Neue, Arial, sans-serif' }}
      >
        Routine Verse
      </h1>
      <p
        className="text-lg text-gray-500 mb-8"
        style={{ fontFamily: '"Google Sans Code", Inter, Helvetica Neue, Arial, sans-serif' }}
      >
        a simple habit tracking app
      </p>

      {/* Login Button */}
      <button
        className="flex items-center gap-4 px-8 py-4 rounded-xl text-2xl font-bold shadow-lg bg-[#373737] text-white hover:bg-[#282828] transition-colors duration-200 border-2 border-[#505050] outline-none focus:ring-4 focus:ring-gray-700"
        onClick={() => setShowModal(true)}
      >
        <span className="text-3xl">🐱</span>
        <span>Login</span>
        <span className="text-3xl">🐶</span>
      </button>

      {/* Modal popup */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div
            className="bg-white rounded-2xl shadow-2xl px-8 py-10 w-96 flex flex-col items-center font-sans relative"
            style={{ fontFamily: '"Google Sans Code", Inter, Helvetica Neue, Arial, sans-serif' }}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-[#373737]">Sign in to Routine Verse</h2>
            <button
              className="flex items-center gap-3 px-6 py-3 bg-[#F8B7D8] hover:bg-[#e89ecf] text-[#373737] font-semibold rounded-full text-lg shadow-md border border-[#e89ecf] my-4 transition-all duration-200"
              onClick={() => signIn('google', { callbackUrl: '/habits' })}
            >
              <FcGoogle size={26} />
              Sign in with Google
            </button>
            <p className="text-sm text-gray-400 mt-6">Your data stays private & secure.</p>
          </div>
        </div>
      )}
    </div>
  );
}
