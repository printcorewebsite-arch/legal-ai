"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type FormData = {
  type: string;
  name: string;
  activity: string;
  address: string;
  capital: string;
  director: string;
  duration: string;
  actions: string;
  exerciseStart: string;
  exerciseEnd: string;
};

type FieldKey = keyof FormData;
type ValidationStatus = "ok" | "warning" | "error" | "empty";

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  type: "",
  name: "",
  activity: "",
  address: "",
  capital: "",
  director: "",
  duration: "",
  actions: "",
  exerciseStart: "",
  exerciseEnd: "",
};

const FIELD_ORDER: FieldKey[] = [
  "type",
  "name",
  "activity",
  "address",
  "capital",
  "director",
  "duration",
  "actions",
  "exerciseStart",
  "exerciseEnd",
];

const FIELD_LABELS: Record<FieldKey, string> = {
  type: "Forme juridique",
  name: "Nom de la société",
  activity: "Activité principale",
  address: "Adresse du siège",
  capital: "Capital social",
  director: "Dirigeant",
  duration: "Durée de la société",
  actions: "Nombre d'actions",
  exerciseStart: "Début de l'exercice",
  exerciseEnd: "Fin de l'exercice",
};

const FIELD_DESCRIPTIONS: Record<FieldKey, string> = {
  type: "SASU, SAS, SARL, EURL ou SCI",
  name: "Dénomination sociale",
  activity: "Objet social de la société",
  address: "Siège social complet",
  capital: "Montant en euros",
  director: "Nom complet du représentant légal",
  duration: "Généralement 99 ans",
  actions: "Nombre de titres composant le capital",
  exerciseStart: "Ex : 1er janvier",
  exerciseEnd: "Ex : 31 décembre",
};

const QUICK_REPLIES: Partial<Record<FieldKey, string[]>> = {
  type: ["SASU", "SAS", "EURL", "SARL", "SCI"],
  capital: ["1 €", "100 €", "1 000 €", "10 000 €"],
  duration: ["99 ans", "50 ans", "30 ans"],
  actions: ["1", "10", "100", "1 000"],
  exerciseStart: ["1er janvier", "1er avril", "1er juillet"],
  exerciseEnd: ["31 décembre", "30 juin", "30 septembre"],
};

const SELECT_OPTIONS: Partial<Record<FieldKey, string[]>> = {
  type: ["SASU", "SAS", "EURL", "SARL", "SCI"],
  duration: ["99 ans", "50 ans", "30 ans", "10 ans"],
  actions: ["1", "10", "100", "1 000"],
  exerciseStart: ["1er janvier", "1er avril", "1er juillet", "1er octobre"],
  exerciseEnd: ["31 décembre", "30 juin", "30 septembre", "31 mars"],
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Bonjour 👋 Je suis votre assistant juridique. Pour commencer, quelle forme juridique souhaitez-vous créer ? (SASU, SAS, SARL, EURL ou SCI)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function v(val?: string) {
  return String(val || "").trim();
}

function getCompanyMeta(type?: string) {
  const t = v(type).toUpperCase();
  const isSARL = t === "SARL" || t === "EURL" || t === "SCI";
  return {
    manager: isSARL ? "Gérant" : "Président",
    shares: isSARL ? "Parts sociales" : "Actions",
  };
}

function getCurrentField(form: FormData): FieldKey {
  for (const field of FIELD_ORDER) {
    if (!v(form[field])) return field;
  }
  return FIELD_ORDER[FIELD_ORDER.length - 1];
}

function validateField(
  field: FieldKey,
  value?: string
): { status: ValidationStatus; message: string } {
  const text = v(value);
  if (!text) return { status: "empty", message: "À compléter" };

  switch (field) {
    case "type": {
      const allowed = ["SASU", "SAS", "EURL", "SARL", "SCI"];
      return allowed.includes(text.toUpperCase())
        ? { status: "ok", message: "Valide" }
        : { status: "warning", message: "Forme à vérifier" };
    }
    case "name":
      if (text.length < 2) return { status: "error", message: "Trop court" };
      if (text.length > 60) return { status: "warning", message: "Nom long" };
      return { status: "ok", message: "Valide" };
    case "capital": {
      const n = Number(text.replace(/[€\s]/g, "").replace(",", "."));
      if (!Number.isFinite(n)) return { status: "error", message: "Montant invalide" };
      if (n < 1) return { status: "error", message: "Minimum 1 €" };
      if (n < 100) return { status: "warning", message: "Capital faible" };
      return { status: "ok", message: "Valide" };
    }
    case "actions": {
      const n = Number(text.replace(/\s/g, ""));
      if (!Number.isInteger(n) || n < 1) {
        return { status: "error", message: "Nombre invalide" };
      }
      return { status: "ok", message: "Valide" };
    }
    case "director":
      if (text.length < 3) return { status: "warning", message: "Nom court" };
      return { status: "ok", message: "Valide" };
    case "address":
      if (text.length < 8) return { status: "warning", message: "Adresse courte" };
      return { status: "ok", message: "Valide" };
    case "duration":
      if (!text.toLowerCase().includes("an")) {
        return { status: "warning", message: "Vérifier l'unité" };
      }
      return { status: "ok", message: "Valide" };
    default:
      return { status: "ok", message: "Renseigné" };
  }
}

function mergeForm(current: FormData, extracted: Partial<FormData>): FormData {
  const merged = { ...current };
  for (const key of FIELD_ORDER) {
    const val = v(extracted[key]);
    if (val) merged[key] = val;
  }
  return merged;
}

function normalizeFromStorage(raw: Record<string, string>): FormData {
  return {
    ...EMPTY_FORM,
    type: raw.type || "",
    name: raw.name || "",
    activity: raw.activity || "",
    address: raw.address || "",
    capital: raw.capital || "",
    director: raw.director || "",
    duration: raw.duration || "",
    actions: raw.actions || "",
    exerciseStart: raw.exerciseStart || raw.exercise_start || "",
    exerciseEnd: raw.exerciseEnd || raw.exercise_end || "",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: ValidationStatus }) {
  const colors: Record<ValidationStatus, string> = {
    ok: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    empty: "#d1d5db",
  };

  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: colors[status],
        flexShrink: 0,
      }}
    />
  );
}

function StepIndicator({
  fields,
  form,
  currentField,
}: {
  fields: FieldKey[];
  form: FormData;
  currentField: FieldKey;
}) {
  return (
    <div className="step-list">
      {fields.map((field, index) => {
        const isActive = field === currentField;
        const isDone = Boolean(v(form[field]));
        const validation = validateField(field, form[field]);

        return (
          <div
            key={field}
            className={`step-item ${isActive ? "step-active" : ""} ${isDone ? "step-done" : ""}`}
          >
            <div className="step-number">
              {isDone ? (
                <span style={{ color: "#10b981", fontSize: "0.75rem" }}>✓</span>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            <div className="step-content">
              <div className="step-label">{FIELD_LABELS[field]}</div>
              {isDone && <div className="step-value">{form[field]}</div>}
            </div>

            {isDone && <StatusDot status={validation.status} />}
          </div>
        );
      })}
    </div>
  );
}

function ChatBubble({
  message,
  isLast,
}: {
  message: ChatMessage;
  isLast: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`bubble-wrapper ${isUser ? "bubble-user" : "bubble-assistant"}`}>
      {!isUser && <div className="bubble-avatar">⚖️</div>}

      <div className={`bubble ${isUser ? "bubble-sent" : "bubble-received"}`}>
        {!isUser && <div className="bubble-name">Assistant</div>}
        <div className="bubble-text">{message.content}</div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="bubble-wrapper bubble-assistant">
      <div className="bubble-avatar">⚖️</div>
      <div className="bubble bubble-received">
        <div className="bubble-name">Assistant</div>
        <div className="typing-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function AssistantPageContent() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("id");

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedCompanyId, setSavedCompanyId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<"chat" | "form">("chat");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from Supabase or localStorage
  useEffect(() => {
    const load = async () => {
      if (companyId) {
        const supabase = createClient();
        const { data } = await supabase.from("companies").select("*").eq("id", companyId).single();

        if (data) {
          const normalized = normalizeFromStorage(data);
          setForm(normalized);
          localStorage.setItem("companyData", JSON.stringify(data));
          return;
        }
      }

      const saved = localStorage.getItem("companyData");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setForm(normalizeFromStorage(parsed));
        } catch {}
      }
    };

    load();
  }, [companyId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const currentField = useMemo(() => getCurrentField(form), [form]);
  const quickReplies = QUICK_REPLIES[currentField] || [];

  const completedCount = useMemo(() => FIELD_ORDER.filter((f) => v(form[f])).length, [form]);
  const progress = Math.round((completedCount / FIELD_ORDER.length) * 100);

  const validations = useMemo(
    () =>
      Object.fromEntries(FIELD_ORDER.map((f) => [f, validateField(f, form[f])])) as Record<
        FieldKey,
        { status: ValidationStatus; message: string }
      >,
    [form]
  );

  const hasError = FIELD_ORDER.some((f) => validations[f].status === "error");
  const isReady = !hasError && completedCount === 10;
  const meta = getCompanyMeta(form.type);

  const updateField = useCallback((field: FieldKey, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      localStorage.setItem("companyData", JSON.stringify(updated));
      return updated;
    });
    setIsConfirmed(false);
  }, []);

  const sendMessage = useCallback(
    async (forcedValue?: string) => {
      const text = (forcedValue ?? input).trim();
      if (!text || loading) return;

      const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];

      setMessages(newMessages);
      setInput("");
      setLoading(true);
      setIsConfirmed(false);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, formData: form }),
        });

        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        const merged = mergeForm(form, data.extracted || {});

        setForm(merged);
        localStorage.setItem("companyData", JSON.stringify(merged));

        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } catch {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: "Une erreur est survenue. Veuillez réessayer.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, messages, form, loading]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSave = async () => {
    if (!isReady) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Vous devez être connecté.");
        setSaving(false);
        return;
      }

      const payload = {
        user_id: user.id,
        type: form.type,
        name: form.name,
        activity: form.activity,
        address: form.address,
        capital: form.capital,
        director: form.director,
        duration: form.duration,
        actions: form.actions,
        exercise_start: form.exerciseStart,
        exercise_end: form.exerciseEnd,
      };

      let result;
      if (companyId) {
        result = await supabase.from("companies").update(payload).eq("id", companyId).select("id").single();
      } else {
        result = await supabase.from("companies").insert(payload).select("id").single();
      }

      if (result.error) throw result.error;

      const id = result.data?.id;
      setSavedCompanyId(id ?? null);
      localStorage.setItem("companyData", JSON.stringify({ ...form, id }));
      setIsSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setLoading(false);
    setIsConfirmed(false);
    setIsSuccess(false);
    setSavedCompanyId(null);
    localStorage.removeItem("companyData");
  };

  if (isSuccess) {
    return (
      <>
        <style>{assistantStyles}</style>
        <main className="assistant-root">
          <div className="success-screen">
            <div className="success-card">
              <div className="success-icon">✅</div>
              <span className="success-badge">Dossier enregistré</span>
              <h1 className="success-title">Votre dossier est prêt</h1>
              <p className="success-desc">
                Les informations ont été sauvegardées. Vous pouvez maintenant consulter et
                télécharger vos statuts.
              </p>

              <div className="success-actions">
                <button
                  onClick={() => {
                    const id = savedCompanyId || companyId;
                    window.location.href = id ? `/document?id=${id}` : "/document";
                  }}
                  className="btn-primary btn-lg"
                >
                  Voir les statuts →
                </button>

                <button onClick={handleReset} className="btn-secondary btn-md">
                  Nouveau dossier
                </button>

                <button onClick={() => (window.location.href = "/dashboard")} className="btn-ghost">
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{assistantStyles}</style>
      <main className="assistant-root">
        <div className="assistant-banner">
          <div className="banner-inner">
            <div className="banner-left">
              <div className="banner-progress-circle">
                <svg viewBox="0 0 36 36" className="circle-svg">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="3"
                    strokeDasharray={`${progress}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="circle-text">{progress}%</span>
              </div>

              <div>
                <h1 className="banner-title">{form.name || "Nouvelle société"}</h1>
                <p className="banner-subtitle">
                  {completedCount} / {FIELD_ORDER.length} champs · Étape en cours :{" "}
                  <strong>{FIELD_LABELS[currentField]}</strong>
                </p>
              </div>
            </div>

            <div className="banner-right">
              <div className="mobile-tabs">
                <button
                  onClick={() => setActivePanel("chat")}
                  className={`tab-btn ${activePanel === "chat" ? "tab-active" : ""}`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActivePanel("form")}
                  className={`tab-btn ${activePanel === "form" ? "tab-active" : ""}`}
                >
                  Dossier
                </button>
              </div>

              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="btn-ghost btn-sm-text"
              >
                ← Dashboard
              </button>
            </div>
          </div>

          <div className="banner-progress-bar">
            <div className="banner-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="assistant-layout">
          <aside className="panel-steps">
            <div className="panel-header">
              <span className="panel-label">Parcours</span>
              <h2 className="panel-title">Étapes</h2>
            </div>

            <StepIndicator fields={FIELD_ORDER} form={form} currentField={currentField} />
          </aside>

          <section className={`panel-chat ${activePanel !== "chat" ? "panel-hidden-mobile" : ""}`}>
            <div className="chat-header">
              <div>
                <span className="panel-label">Assistant juridique</span>
                <h2 className="panel-title">Conversation guidée</h2>
              </div>
              <div className="current-field-badge">{FIELD_LABELS[currentField]}</div>
            </div>

            <div className="chat-messages">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} isLast={i === messages.length - 1} />
              ))}
              {loading && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>

            {quickReplies.length > 0 && !loading && (
              <div className="quick-replies">
                <span className="quick-label">Suggestions</span>
                <div className="quick-buttons">
                  {quickReplies.map((r) => (
                    <button
                      key={r}
                      onClick={() => sendMessage(r)}
                      disabled={loading}
                      className="quick-btn"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="chat-input-area">
              <div className="input-context">
                <span className="input-context-label">Répondez à :</span>
                <span className="input-context-field">{FIELD_LABELS[currentField]}</span>
                <span className="input-context-desc">{FIELD_DESCRIPTIONS[currentField]}</span>
              </div>

              <div className="input-row">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  placeholder={`Votre réponse pour : ${FIELD_LABELS[currentField]}...`}
                  className="chat-textarea"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="send-btn"
                >
                  {loading ? (
                    <span className="spinner" />
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="input-footer">
                <span className="input-hint">
                  Entrée pour envoyer · Maj+Entrée pour retour à la ligne
                </span>
                <button onClick={handleReset} className="reset-btn">
                  Réinitialiser
                </button>
              </div>
            </div>
          </section>

          <aside className={`panel-form ${activePanel !== "form" ? "panel-hidden-mobile" : ""}`}>
            <div className="form-card">
              <div className="form-card-header">
                <div>
                  <span className="panel-label">Dossier client</span>
                  <h2 className="panel-title">Aperçu structuré</h2>
                </div>

                <span
                  className={`status-badge ${
                    isConfirmed ? "badge-ok" : hasError ? "badge-error" : "badge-warn"
                  }`}
                >
                  {isConfirmed
                    ? "Confirmé"
                    : hasError
                      ? "Incomplet"
                      : completedCount === 10
                        ? "À vérifier"
                        : "En cours"}
                </span>
              </div>

              <div className="form-fields">
                {FIELD_ORDER.map((field) => {
                  const val = validations[field];
                  const hasSelect = Boolean(SELECT_OPTIONS[field]);

                  return (
                    <div
                      key={field}
                      className={`form-field ${
                        val.status === "ok"
                          ? "field-ok"
                          : val.status === "warning"
                            ? "field-warn"
                            : val.status === "error"
                              ? "field-error"
                              : "field-empty"
                      }`}
                    >
                      <label className="field-label">{FIELD_LABELS[field]}</label>

                      {hasSelect ? (
                        <select
                          value={form[field]}
                          onChange={(e) => updateField(field, e.target.value)}
                          className="field-input"
                        >
                          <option value="">Sélectionner...</option>
                          {SELECT_OPTIONS[field]!.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={form[field]}
                          onChange={(e) => updateField(field, e.target.value)}
                          className="field-input"
                          placeholder={FIELD_DESCRIPTIONS[field]}
                        />
                      )}

                      <div
                        className={`field-validation ${
                          val.status === "ok"
                            ? "validation-ok"
                            : val.status === "warning"
                              ? "validation-warn"
                              : val.status === "error"
                                ? "validation-error"
                                : "validation-empty"
                        }`}
                      >
                        <StatusDot status={val.status} />
                        <span>{val.message}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="form-actions">
                <button
                  onClick={() => {
                    if (isReady) setIsConfirmed(true);
                  }}
                  disabled={!isReady || isConfirmed}
                  className="btn-primary btn-full"
                >
                  {isConfirmed ? "✓ Informations confirmées" : "Confirmer les informations"}
                </button>

                <button
                  onClick={handleSave}
                  disabled={!isConfirmed || saving}
                  className="btn-secondary btn-full"
                >
                  {saving
                    ? "Sauvegarde..."
                    : companyId
                      ? "Mettre à jour & générer"
                      : "Sauvegarder & générer les statuts"}
                </button>
              </div>
            </div>

            <div className="preview-card">
              <span className="panel-label">Aperçu</span>
              <h3 className="preview-title">{form.type || "—"}</h3>
              <p className="preview-name">{form.name || "Nom de la société"}</p>

              <div className="preview-grid">
                {[
                  ["Objet", form.activity],
                  ["Siège", form.address],
                  ["Capital", form.capital ? `${form.capital} €` : ""],
                  [meta.manager, form.director],
                  ["Durée", form.duration],
                  [meta.shares, form.actions],
                  [
                    "Exercice",
                    form.exerciseStart && form.exerciseEnd
                      ? `${form.exerciseStart} → ${form.exerciseEnd}`
                      : "",
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="preview-item">
                    <span className="preview-label">{label}</span>
                    <span className="preview-value">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <>
          <style>{assistantStyles}</style>
          <main className="assistant-root">
            <div className="success-screen">
              <div className="success-card">
                <div className="success-icon">⚖️</div>
                <h1 className="success-title">Chargement...</h1>
                <p className="success-desc">Préparation de votre assistant juridique.</p>
              </div>
            </div>
          </main>
        </>
      }
    >
      <AssistantPageContent />
    </Suspense>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const assistantStyles = `
  .assistant-root {
    min-height: 100vh;
    background: #f7f4ee;
    font-family: 'Georgia', 'Times New Roman', serif;
  }

  /* ── BANNER ── */
  .assistant-banner {
    background: #fff;
    border-bottom: 1px solid #e8e2d8;
    position: sticky;
    top: 64px;
    z-index: 30;
  }

  .banner-inner {
    max-width: 1500px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .banner-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .banner-progress-circle {
    position: relative;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }

  .circle-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .circle-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 700;
    color: #0f766e;
    font-family: 'Inter', sans-serif;
  }

  .banner-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .banner-subtitle {
    font-size: 0.78rem;
    color: #9ca3af;
    margin: 0.15rem 0 0;
    font-family: 'Inter', sans-serif;
  }

  .banner-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .banner-progress-bar {
    height: 3px;
    background: #ede8df;
    overflow: hidden;
  }

  .banner-progress-fill {
    height: 100%;
    background: #0f766e;
    transition: width 0.4s ease;
  }

  /* ── LAYOUT ── */
  .assistant-layout {
    max-width: 1500px;
    margin: 0 auto;
    padding: 1.25rem 1.25rem 4rem;
    display: grid;
    grid-template-columns: 260px 1fr 360px;
    gap: 1.25rem;
    align-items: start;
  }

  /* ── PANELS ── */
  .panel-steps, .panel-chat, .panel-form {
    background: #fff;
    border: 1px solid #e8e2d8;
    border-radius: 20px;
    overflow: hidden;
  }

  .panel-header, .chat-header, .form-card-header {
    padding: 1.25rem 1.25rem 1rem;
    border-bottom: 1px solid #f0ece4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .panel-label {
    display: block;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
    margin-bottom: 0.2rem;
    font-family: 'Inter', sans-serif;
  }

  .panel-title {
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  /* ── STEPS ── */
  .step-list {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .step-item {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.65rem 0.75rem;
    border-radius: 12px;
    border: 1px solid transparent;
    background: #fafaf8;
    transition: all 0.15s;
  }

  .step-active {
    background: #eef8f7;
    border-color: #a7d8d4;
  }

  .step-done {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .step-number {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 700;
    color: #6b7280;
    flex-shrink: 0;
    font-family: 'Inter', sans-serif;
  }

  .step-active .step-number {
    background: #0f766e;
    color: white;
  }

  .step-done .step-number {
    background: #d1fae5;
  }

  .step-content { flex: 1; min-width: 0; }

  .step-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #374151;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .step-active .step-label { color: #0f766e; }

  .step-value {
    font-size: 0.68rem;
    color: #6b7280;
    margin-top: 0.1rem;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── CHAT ── */
  .chat-messages {
    padding: 1rem 1.25rem;
    min-height: 300px;
    max-height: 440px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    scroll-behavior: smooth;
  }

  .bubble-wrapper {
    display: flex;
    gap: 0.6rem;
    max-width: 90%;
  }

  .bubble-user { align-self: flex-end; flex-direction: row-reverse; }
  .bubble-assistant { align-self: flex-start; }

  .bubble-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    flex-shrink: 0;
    margin-top: 0.2rem;
  }

  .bubble {
    padding: 0.75rem 1rem;
    border-radius: 18px;
    max-width: 100%;
  }

  .bubble-sent {
    background: #0f766e;
    color: white;
    border-bottom-right-radius: 4px;
  }

  .bubble-received {
    background: #fafaf8;
    border: 1px solid #e8e2d8;
    color: #111827;
    border-bottom-left-radius: 4px;
  }

  .bubble-name {
    font-size: 0.68rem;
    font-weight: 600;
    color: #9ca3af;
    margin-bottom: 0.3rem;
    font-family: 'Inter', sans-serif;
  }

  .bubble-text {
    font-size: 0.875rem;
    line-height: 1.6;
    font-family: 'Inter', sans-serif;
    white-space: pre-wrap;
  }

  .bubble-sent .bubble-text { color: rgba(255,255,255,0.95); }

  /* ── TYPING ── */
  .typing-dots {
    display: flex;
    gap: 4px;
    padding: 0.25rem 0;
  }

  .typing-dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #9ca3af;
    animation: bounce 1.2s ease-in-out infinite;
  }

  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }

  /* ── QUICK REPLIES ── */
  .quick-replies {
    padding: 0.75rem 1.25rem;
    border-top: 1px solid #f0ece4;
    background: #fafaf8;
  }

  .quick-label {
    font-size: 0.68rem;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: 'Inter', sans-serif;
    display: block;
    margin-bottom: 0.5rem;
  }

  .quick-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .quick-btn {
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    background: #fff;
    font-size: 0.78rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.12s;
    font-family: 'Inter', sans-serif;
  }

  .quick-btn:hover {
    border-color: #0f766e;
    color: #0f766e;
    background: #f0fdf4;
  }

  .quick-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── INPUT AREA ── */
  .chat-input-area {
    padding: 1rem 1.25rem;
    border-top: 1px solid #e8e2d8;
    background: #fff;
  }

  .input-context {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
    flex-wrap: wrap;
  }

  .input-context-label {
    font-size: 0.72rem;
    color: #9ca3af;
    font-family: 'Inter', sans-serif;
  }

  .input-context-field {
    font-size: 0.75rem;
    font-weight: 600;
    color: #0f766e;
    font-family: 'Inter', sans-serif;
  }

  .input-context-desc {
    font-size: 0.7rem;
    color: #9ca3af;
    font-family: 'Inter', sans-serif;
  }

  .input-row {
    display: flex;
    gap: 0.6rem;
    align-items: flex-end;
  }

  .chat-textarea {
    flex: 1;
    padding: 0.75rem 1rem;
    border-radius: 14px;
    border: 1px solid #e5e7eb;
    background: #f9f8f5;
    font-size: 0.875rem;
    font-family: 'Inter', sans-serif;
    color: #111827;
    outline: none;
    resize: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    line-height: 1.5;
  }

  .chat-textarea:focus {
    border-color: #0f766e;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
    background: #fff;
  }

  .chat-textarea:disabled { opacity: 0.6; cursor: not-allowed; }

  .send-btn {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: #0f766e;
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s, transform 0.12s;
  }

  .send-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .input-footer {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .input-hint {
    font-size: 0.68rem;
    color: #d1d5db;
    font-family: 'Inter', sans-serif;
  }

  .reset-btn {
    font-size: 0.72rem;
    color: #9ca3af;
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    padding: 0;
    transition: color 0.12s;
  }

  .reset-btn:hover { color: #ef4444; }

  /* ── CURRENT FIELD BADGE ── */
  .current-field-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: #0f766e;
    background: #f0fdf4;
    border: 1px solid #a7f3d0;
    border-radius: 999px;
    padding: 0.3rem 0.85rem;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
  }

  /* ── FORM PANEL ── */
  .form-card, .preview-card {
    padding: 1.25rem;
  }

  .preview-card {
    border-top: 1px solid #f0ece4;
    background: #fafaf8;
  }

  .status-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-family: 'Inter', sans-serif;
  }

  .badge-ok { background: #d1fae5; color: #065f46; }
  .badge-warn { background: #fef3c7; color: #92400e; }
  .badge-error { background: #fee2e2; color: #991b1b; }

  .form-fields {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 1rem;
    max-height: 420px;
    overflow-y: auto;
    padding-right: 2px;
  }

  .form-field {
    padding: 0.65rem 0.75rem;
    border-radius: 12px;
    border: 1px solid;
  }

  .field-ok { border-color: #a7f3d0; background: #f0fdf4; }
  .field-warn { border-color: #fcd34d; background: #fffbeb; }
  .field-error { border-color: #fca5a5; background: #fef2f2; }
  .field-empty { border-color: #e5e7eb; background: #fafaf8; }

  .field-label {
    display: block;
    font-size: 0.68rem;
    color: #6b7280;
    margin-bottom: 0.35rem;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  }

  .field-input {
    width: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.45rem 0.65rem;
    font-size: 0.8rem;
    font-family: 'Inter', sans-serif;
    color: #111827;
    background: #fff;
    outline: none;
    transition: border-color 0.12s;
  }

  .field-input:focus { border-color: #0f766e; }

  .field-validation {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.3rem;
    font-size: 0.67rem;
    font-family: 'Inter', sans-serif;
  }

  .validation-ok { color: #059669; }
  .validation-warn { color: #d97706; }
  .validation-error { color: #dc2626; }
  .validation-empty { color: #9ca3af; }

  .form-actions {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 1rem;
  }

  .btn-full { width: 100%; }

  /* Preview */
  .preview-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: #0f766e;
    margin: 0.5rem 0 0.1rem;
  }

  .preview-name {
    font-size: 0.95rem;
    color: #111827;
    font-weight: 600;
    margin: 0 0 0.75rem;
    font-family: 'Inter', sans-serif;
  }

  .preview-grid {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .preview-item {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
  }

  .preview-label { color: #9ca3af; flex-shrink: 0; }
  .preview-value {
    color: #374151;
    font-weight: 500;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60%;
  }

  /* ── BUTTONS ── */
  .btn-primary {
    background: #0f766e;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.12s, box-shadow 0.12s, opacity 0.12s;
    font-family: 'Inter', sans-serif;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(15,118,110,0.25); }
  .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  .btn-secondary {
    background: #fff;
    color: #374151;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s, transform 0.12s;
    font-family: 'Inter', sans-serif;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn-secondary:hover:not(:disabled) { background: #f9f8f5; transform: translateY(-1px); }
  .btn-secondary:disabled { opacity: 0.45; cursor: not-allowed; }

  .btn-ghost {
    background: transparent;
    color: #6b7280;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: background 0.12s;
  }

  .btn-ghost:hover { background: #f3f4f6; }

  .btn-sm { padding: 0.35rem 0.85rem; font-size: 0.78rem; }
  .btn-sm-text { padding: 0.35rem 0.85rem; font-size: 0.78rem; }
  .btn-md { padding: 0.6rem 1.2rem; font-size: 0.875rem; }
  .btn-lg { padding: 0.85rem 2rem; font-size: 1rem; }

  /* ── SUCCESS SCREEN ── */
  .success-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .success-card {
    background: #fff;
    border: 1px solid #e8e2d8;
    border-radius: 28px;
    padding: 4rem 3rem;
    text-align: center;
    max-width: 480px;
    width: 100%;
  }

  .success-icon { font-size: 3.5rem; margin-bottom: 1rem; }

  .success-badge {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #059669;
    background: #d1fae5;
    border-radius: 999px;
    padding: 0.3rem 0.85rem;
    font-family: 'Inter', sans-serif;
    margin-bottom: 1rem;
  }

  .success-title {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.03em;
    margin: 0 0 0.75rem;
  }

  .success-desc {
    color: #6b7280;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .success-actions {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  /* ── MOBILE ── */
  .mobile-tabs {
    display: none;
    background: #f3f4f6;
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
  }

  .tab-btn {
    padding: 0.35rem 0.9rem;
    border-radius: 8px;
    border: none;
    background: transparent;
    font-size: 0.78rem;
    font-weight: 600;
    color: #6b7280;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.15s;
  }

  .tab-active {
    background: #fff;
    color: #0f766e;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  @media (max-width: 1200px) {
    .assistant-layout {
      grid-template-columns: 220px 1fr 320px;
    }
  }

  @media (max-width: 900px) {
    .assistant-layout {
      grid-template-columns: 1fr;
    }

    .panel-steps { display: none; }
    .mobile-tabs { display: flex; }

    .panel-hidden-mobile { display: none; }
  }

  @media (max-width: 640px) {
    .banner-inner { flex-wrap: wrap; }
    .assistant-layout { padding: 0.75rem 0.75rem 3rem; }
    .success-card { padding: 2.5rem 1.5rem; }
  }
`;