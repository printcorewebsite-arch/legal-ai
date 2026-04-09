"use client";

import { useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type FormData = {
  type?: string;
  name?: string;
  activity?: string;
  address?: string;
  capital?: string;
  director?: string;
};

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Bonjour 👋 je vais vous aider à créer votre société. Dites-moi ce que vous voulez faire.",
    },
  ]);
  const [formData, setFormData] = useState<FormData>({});
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const updateForm = (value: string) => {
    const updated = { ...formData };

    if (step === 1) updated.type = value;
    if (step === 2) updated.name = value;
    if (step === 3) updated.activity = value;
    if (step === 4) updated.address = value;
    if (step === 5) updated.capital = value;
    if (step === 6) updated.director = value;

    setFormData(updated);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    updateForm(input);

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);

      setStep((prev) => (prev < 6 ? prev + 1 : 6));
    } catch (error) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Erreur serveur.",
        },
      ]);
    }

    setLoading(false);
  };

  // ✅ SAUVEGARDE + REDIRECTION
  const generateStatus = () => {
    localStorage.setItem("companyData", JSON.stringify(formData));
    window.location.href = "/document";
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
        
        {/* LEFT */}
        <div>
          <h1 className="text-3xl font-bold mb-4 text-center md:text-left">
            Assistant création de société
          </h1>

          <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-gray-300">Progression</span>
            <span className="text-sm font-semibold text-white">
              Étape {step} / 6
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
              {messages.map((msg, index) => (
                <p key={index}>
                  {msg.role === "user" ? "👤 " : "🤖 "}
                  {msg.content}
                </p>
              ))}

              {loading && <p className="text-gray-400">🤖 Chargement...</p>}
            </div>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Écris ta réponse..."
              className="w-full p-3 rounded-xl bg-black border border-white/20 text-white"
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="mt-4 w-full bg-white text-black py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? "Chargement..." : "Continuer"}
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-4">Dossier client</h2>

          <div className="space-y-3 text-sm">
            <p><span className="text-gray-400">Type :</span> {formData.type || "-"}</p>
            <p><span className="text-gray-400">Nom :</span> {formData.name || "-"}</p>
            <p><span className="text-gray-400">Activité :</span> {formData.activity || "-"}</p>
            <p><span className="text-gray-400">Adresse :</span> {formData.address || "-"}</p>
            <p><span className="text-gray-400">Capital :</span> {formData.capital || "-"}</p>
            <p><span className="text-gray-400">Dirigeant :</span> {formData.director || "-"}</p>
          </div>

          {formData.name && (
            <div className="mt-6 p-4 border border-white/10 rounded-xl bg-white/5">
              <h3 className="text-lg font-semibold mb-2">
                Génération de document
              </h3>

              <p className="text-gray-400 mb-3">
                Génère les statuts de la société automatiquement.
              </p>

              <button
                className="bg-white text-black px-4 py-2 rounded-lg font-semibold"
                onClick={generateStatus}
              >
                Générer les statuts
              </button>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}