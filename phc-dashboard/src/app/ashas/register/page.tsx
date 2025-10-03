"use client";

import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import DashboardLayout from "../../../components/DashboardLayout";

export default function RegisterAsha() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      await setDoc(doc(db, "users", uid), {
        name,
        email,
        role: "asha",
        created_at: new Date().toISOString(),
      });
      setSuccess("Registration successful!");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
          <h2 className="text-3xl font-bold text-blue-700 mb-2 text-center">Register ASHA Worker</h2>
          <p className="text-gray-500 mb-6 text-center">Create a new ASHA account for your PHC team</p>
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Create a password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register"}
            </button>
            {error && <p className="text-center text-red-500 font-medium mt-2">{error}</p>}
            {success && <p className="text-center text-green-600 font-medium mt-2">{success}</p>}
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
