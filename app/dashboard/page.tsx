"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Company = {
  id: number;
  user_id: string;
  type: string | null;
  name: string | null;
  activity: string | null;
  address: string | null;
  capital: string | null;
  director: string | null;
  duration: string | null;
  actions: string | null;
  exercise_start: string | null;
  exercise_end: string | null;
  created_at: string;
};

function getCompanyMeta(type?: string | null) {
  const t = String(type || "").toUpperCase();
  const isSARL = t === "SARL" || t === "EURL" || t === "SCI";
  return {
    label: t || "?",
    manager: isSARL ? "Gérant" : "Président",
    shares: isSARL ? "Parts sociales" : "Actions",
    color:
      t === "SASU" ? "#6366f1"
      : t === "SAS" ? "#0f766e"
      : t === "SARL" ? "#d97706"
      : t === "EURL" ? "#7c3aed"
      : t === "SCI" ? "#0369a1"
      : "#64748b",
  };
}

function CompanyCard({
  company,
  onDelete,
  onOpen,
  onEdit,
}: {
  company: Company;
  onDelete: (id: number) => void;
  onOpen: (company: Company) => void;
  onEdit: (company: Company) => void;
}) {
  const meta = getCompanyMeta(company.type);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Supprimer le dossier "${company.name || "Sans nom"}" ?`)) return;
    setDeleting(true);
    onDelete(company.id);
  };

  const completedFields = [
    company.type, company.name, company.activity, company.address,
    company.capital, company.director, company.duration,
    company.actions, company.exercise_start, company.exercise_end,
  ].filter((x) => String(x || "").trim()).length;

  const progress = Math.round((completedFields / 10) * 100);

  return (
    <div className="company-card">
      <div className="card-inner">
        {/* Top row */}
        <div className="card-top">
          <div className="card-badges">
            <span className="type-badge" style={{ background: meta.color + "18", color: meta.color, border: `1px solid ${meta.color}30` }}>
              {meta.label}
            </span>
            <span className="date-badge">
              {new Date(company.created_at).toLocaleDateString("fr-FR", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </span>
            {progress === 100 && (
              <span className="complete-badge">✓ Complet</span>
            )}
          </div>

          <div className="card-actions">
            <button onClick={() => onOpen(company)} className="btn-primary btn-sm">
              Voir les statuts
            </button>
            <button onClick={() => onEdit(company)} className="btn-secondary btn-sm">
              Modifier
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger btn-sm"
            >
              {deleting ? "..." : "✕"}
            </button>
          </div>
        </div>

        {/* Company name */}
        <h2 className="company-name">{company.name || "Sans nom"}</h2>

        {/* Info grid */}
        <div className="info-grid">
          {[
            { label: "Activité", value: company.activity },
            { label: "Capital", value: company.capital ? `${company.capital} €` : null },
            { label: "Siège social", value: company.address },
            { label: meta.manager, value: company.director },
          ].map((item) => (
            <div key={item.label} className="info-item">
              <span className="info-label">{item.label}</span>
              <span className="info-value">{item.value || "—"}</span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="progress-row">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-label">{completedFields}/10</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">⚖️</div>
      <h2 className="empty-title">Aucune société créée</h2>
      <p className="empty-desc">
        Lancez votre premier dossier en quelques minutes avec l'assistant IA.
      </p>
      <button onClick={onNew} className="btn-primary btn-lg">
        Créer ma première société
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      window.location.href = "/auth";
      return;
    }

    setUserEmail(user.email ?? null);

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setCompanies(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: number) => {
    await supabase.from("companies").delete().eq("id", id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  const handleOpen = (company: Company) => {
    localStorage.setItem("companyData", JSON.stringify(company));
    window.location.href = `/document?id=${company.id}`;
  };

  const handleEdit = (company: Company) => {
    localStorage.setItem("companyData", JSON.stringify(company));
    window.location.href = `/assistant?id=${company.id}`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.type || "").toLowerCase().includes(q) ||
      (c.activity || "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: companies.length,
    complete: companies.filter((c) => {
      return [c.type, c.name, c.activity, c.address, c.capital, c.director, c.duration, c.actions, c.exercise_start, c.exercise_end]
        .every((x) => String(x || "").trim());
    }).length,
    types: [...new Set(companies.map((c) => c.type).filter(Boolean))].length,
  };

  return (
    <>
      <style>{`
        .dashboard-root {
          min-height: 100vh;
          background: #f7f4ee;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        /* ── HEADER ── */
        .dashboard-header {
          background: #fff;
          border-bottom: 1px solid #e8e2d8;
          padding: 0 2rem;
          position: sticky;
          top: 64px;
          z-index: 30;
        }

        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 0;
          gap: 1rem;
        }

        .header-left h1 {
          font-size: 1.6rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.03em;
          margin: 0;
        }

        .header-left p {
          font-size: 0.82rem;
          color: #9ca3af;
          margin: 0.2rem 0 0;
          font-family: 'Inter', sans-serif;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .search-input {
          padding: 0.55rem 1rem;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f9f8f5;
          font-size: 0.875rem;
          outline: none;
          width: 220px;
          font-family: 'Inter', sans-serif;
          color: #111827;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .search-input:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
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
        }

        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(15,118,110,0.25); }
        .btn-primary:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }

        .btn-secondary {
          background: #fff;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.12s, transform 0.12s;
          font-family: 'Inter', sans-serif;
        }

        .btn-secondary:hover { background: #f9f8f5; transform: translateY(-1px); }

        .btn-danger {
          background: #fff;
          color: #ef4444;
          border: 1px solid #fca5a5;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.12s;
          font-family: 'Inter', sans-serif;
        }

        .btn-danger:hover { background: #fef2f2; }
        .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-sm { padding: 0.4rem 0.9rem; font-size: 0.8rem; }
        .btn-md { padding: 0.6rem 1.2rem; font-size: 0.875rem; }
        .btn-lg { padding: 0.9rem 2rem; font-size: 1rem; }

        .btn-ghost {
          background: transparent;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.8rem;
          padding: 0.4rem 0.85rem;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.12s;
        }

        .btn-ghost:hover { background: #f3f4f6; }

        /* ── STATS BAR ── */
        .stats-bar {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.5rem 2rem;
          display: flex;
          gap: 1rem;
        }

        .stat-card {
          background: #fff;
          border: 1px solid #e8e2d8;
          border-radius: 16px;
          padding: 1rem 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: 'Inter', sans-serif;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.04em;
          line-height: 1;
        }

        .stat-sub {
          font-size: 0.75rem;
          color: #6b7280;
          font-family: 'Inter', sans-serif;
        }

        /* ── CONTENT ── */
        .content-area {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem 4rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          font-family: 'Inter', sans-serif;
        }

        /* ── COMPANY CARD ── */
        .company-card {
          background: #fff;
          border: 1px solid #e8e2d8;
          border-radius: 20px;
          overflow: hidden;
          transition: box-shadow 0.2s, transform 0.2s;
          margin-bottom: 1rem;
        }

        .company-card:hover {
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
        }

        .card-inner {
          padding: 1.5rem;
        }

        .card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .card-badges {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .type-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.25rem 0.7rem;
          border-radius: 999px;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.05em;
        }

        .date-badge {
          font-size: 0.72rem;
          color: #9ca3af;
          font-family: 'Inter', sans-serif;
        }

        .complete-badge {
          font-size: 0.7rem;
          font-weight: 600;
          color: #059669;
          background: #d1fae5;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-family: 'Inter', sans-serif;
        }

        .card-actions {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .company-name {
          font-size: 1.6rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.03em;
          margin: 0 0 1rem;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        @media (min-width: 768px) {
          .info-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          padding: 0.65rem 0.75rem;
          background: #fafaf8;
          border-radius: 10px;
          border: 1px solid #f0ece4;
        }

        .info-label {
          font-size: 0.68rem;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: 'Inter', sans-serif;
        }

        .info-value {
          font-size: 0.82rem;
          color: #111827;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .progress-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .progress-track {
          flex: 1;
          height: 4px;
          background: #ede8df;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #0f766e;
          border-radius: 999px;
          transition: width 0.4s ease;
        }

        .progress-label {
          font-size: 0.72rem;
          color: #9ca3af;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }

        /* ── EMPTY STATE ── */
        .empty-state {
          background: #fff;
          border: 1px solid #e8e2d8;
          border-radius: 24px;
          padding: 5rem 2rem;
          text-align: center;
        }

        .empty-icon { font-size: 3.5rem; margin-bottom: 1rem; }

        .empty-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.5rem;
        }

        .empty-desc {
          color: #6b7280;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
        }

        /* ── LOADING ── */
        .loading-card {
          background: #fff;
          border: 1px solid #e8e2d8;
          border-radius: 20px;
          padding: 2rem 1.5rem;
          margin-bottom: 1rem;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .skeleton {
          background: #f0ece4;
          border-radius: 6px;
        }

        /* ── SEARCH RESULTS ── */
        .results-info {
          font-size: 0.8rem;
          color: #9ca3af;
          font-family: 'Inter', sans-serif;
        }

        /* ── USER INFO ── */
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: #0f766e;
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
        }

        .user-email {
          font-size: 0.8rem;
          color: #6b7280;
          font-family: 'Inter', sans-serif;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .stats-bar { padding: 1rem; flex-wrap: wrap; }
          .content-area { padding: 0 1rem 3rem; }
          .dashboard-header { padding: 0 1rem; }
          .header-inner { flex-wrap: wrap; }
          .search-input { width: 100%; }
          .card-top { flex-direction: column; }
          .card-actions { width: 100%; justify-content: flex-end; }
          .user-email { display: none; }
        }
      `}</style>

      <div className="dashboard-root">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-inner">
            <div className="header-left">
              <h1>Mes sociétés</h1>
              <p>
                {loading
                  ? "Chargement..."
                  : `${companies.length} dossier${companies.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="header-right">
              <input
                type="search"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />

              {userEmail && (
                <div className="user-info">
                  <div className="user-avatar">
                    {userEmail.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-email">{userEmail}</span>
                </div>
              )}

              <button
                onClick={() => (window.location.href = "/assistant")}
                className="btn-primary btn-md"
              >
                + Nouveau
              </button>

              <button onClick={handleLogout} className="btn-ghost">
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {!loading && companies.length > 0 && (
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-label">Total</span>
              <span className="stat-value">{stats.total}</span>
              <span className="stat-sub">dossier{stats.total !== 1 ? "s" : ""}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Complets</span>
              <span className="stat-value" style={{ color: "#0f766e" }}>
                {stats.complete}
              </span>
              <span className="stat-sub">prêt{stats.complete !== 1 ? "s" : ""} à générer</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Formes</span>
              <span className="stat-value">{stats.types}</span>
              <span className="stat-sub">type{stats.types !== 1 ? "s" : ""} différent{stats.types !== 1 ? "s" : ""}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">En cours</span>
              <span className="stat-value" style={{ color: "#d97706" }}>
                {stats.total - stats.complete}
              </span>
              <span className="stat-sub">à compléter</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="content-area">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="loading-card">
                  <div className="skeleton" style={{ height: 12, width: "30%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 24, width: "55%", marginBottom: 16 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="skeleton" style={{ height: 50, borderRadius: 10 }} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : companies.length === 0 ? (
            <EmptyState onNew={() => (window.location.href = "/assistant")} />
          ) : (
            <>
              <div className="section-header">
                <span className="section-title">
                  {search
                    ? `${filtered.length} résultat${filtered.length !== 1 ? "s" : ""} pour "${search}"`
                    : `${companies.length} société${companies.length !== 1 ? "s" : ""}`}
                </span>
                {search && filtered.length === 0 && (
                  <button onClick={() => setSearch("")} className="btn-ghost">
                    Effacer la recherche
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state" style={{ padding: "3rem" }}>
                  <div className="empty-icon">🔍</div>
                  <h2 className="empty-title">Aucun résultat</h2>
                  <p className="empty-desc">Essayez un autre terme de recherche.</p>
                </div>
              ) : (
                filtered.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onDelete={handleDelete}
                    onOpen={handleOpen}
                    onEdit={handleEdit}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}