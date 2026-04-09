"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    if (!email || !password) {
      alert("Merci de remplir l’email et le mot de passe.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Compte créé avec succès. Vérifiez votre email si une confirmation est demandée.");
  };

  const signIn = async () => {
    if (!email || !password) {
      alert("Merci de remplir l’email et le mot de passe.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/assistant";
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold mb-2">Connexion</h1>
        <p className="text-gray-400 mb-6">
          Connectez-vous ou créez un compte pour sauvegarder vos dossiers.
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-black px-4 py-3 text-white"
          />

          <input
            type="password"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-black px-4 py-3 text-white"
          />

          <button
            onClick={signIn}
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Chargement..." : "Se connecter"}
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="w-full rounded-xl border border-white/20 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            Créer un compte
          </button>
        </div>
      </div>
    </main>
  );
}