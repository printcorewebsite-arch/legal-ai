import Link from "next/link";

export default function Home() {
  return (
    <>
      <style>{`
        .home-root {
          min-height: 100vh;
          background: #f7f4ee;
          font-family: 'Georgia', 'Times New Roman', serif;
          overflow-x: hidden;
        }

        /* ── HERO ── */
        .hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 1.5rem 4rem;
          text-align: center;
          position: relative;
        }

        /* Subtle background pattern */
        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 20% 20%, rgba(15, 118, 110, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(15, 118, 110, 0.04) 0%, transparent 50%);
          pointer-events: none;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #d8d2c6;
          background: #fff;
          border-radius: 999px;
          padding: 0.45rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #6b7280;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.02em;
          margin-bottom: 2rem;
          box-shadow: 0 1px 4px rgba(15,23,42,0.06);
        }

        .hero-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0f766e;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }

        .hero-title {
          font-size: clamp(2.8rem, 7vw, 5.5rem);
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.04em;
          line-height: 1.08;
          margin: 0 0 1.5rem;
          max-width: 820px;
        }

        .hero-title-accent {
          color: #0f766e;
          position: relative;
        }

        .hero-desc {
          font-size: clamp(1rem, 2vw, 1.2rem);
          color: #6b7280;
          max-width: 560px;
          line-height: 1.75;
          margin: 0 auto 2.5rem;
          font-family: 'Inter', sans-serif;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.875rem;
          justify-content: center;
          margin-bottom: 3.5rem;
        }

        .btn-hero-primary {
          background: #0f766e;
          color: #fff;
          padding: 0.9rem 2.2rem;
          border-radius: 16px;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 8px 24px rgba(15, 118, 110, 0.22);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-hero-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(15, 118, 110, 0.3);
        }

        .btn-hero-secondary {
          background: #fff;
          color: #374151;
          padding: 0.9rem 2.2rem;
          border-radius: 16px;
          font-size: 1rem;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          text-decoration: none;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-hero-secondary:hover {
          transform: translateY(-2px);
          background: #fafaf9;
        }

        /* Trust bar */
        .trust-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          justify-content: center;
          align-items: center;
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #9ca3af;
          font-family: 'Inter', sans-serif;
        }

        .trust-check {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #d1fae5;
          color: #059669;
          font-size: 0.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        /* ── FEATURES ── */
        .features-section {
          padding: 5rem 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-eyebrow {
          text-align: center;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #0f766e;
          font-family: 'Inter', sans-serif;
          margin-bottom: 1rem;
        }

        .section-title {
          text-align: center;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.03em;
          margin: 0 auto 1rem;
          max-width: 600px;
        }

        .section-desc {
          text-align: center;
          color: #6b7280;
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          max-width: 480px;
          margin: 0 auto 3.5rem;
          line-height: 1.7;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }

        .feature-card {
          background: #fff;
          border: 1px solid #e8e2d8;
          border-radius: 20px;
          padding: 2rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .feature-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #f0fdf4;
          border: 1px solid #a7f3d0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          margin-bottom: 1.25rem;
        }

        .feature-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.6rem;
          letter-spacing: -0.02em;
        }

        .feature-desc {
          font-size: 0.875rem;
          color: #6b7280;
          font-family: 'Inter', sans-serif;
          line-height: 1.65;
          margin: 0;
        }

        /* ── STEPS ── */
        .steps-section {
          padding: 5rem 1.5rem;
          background: #fff;
          border-top: 1px solid #e8e2d8;
          border-bottom: 1px solid #e8e2d8;
        }

        .steps-inner {
          max-width: 900px;
          margin: 0 auto;
        }

        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-top: 3rem;
          position: relative;
        }

        .steps-line {
          position: absolute;
          left: 23px;
          top: 24px;
          bottom: 24px;
          width: 2px;
          background: linear-gradient(180deg, #0f766e, #a7f3d0);
          border-radius: 999px;
        }

        .step-row {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
          padding: 1.5rem 0;
        }

        .step-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #0f766e;
          color: white;
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
          position: relative;
          z-index: 1;
          box-shadow: 0 0 0 4px #f7f4ee;
        }

        .step-body { padding-top: 0.5rem; }

        .step-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.35rem;
          letter-spacing: -0.02em;
        }

        .step-desc {
          font-size: 0.875rem;
          color: #6b7280;
          font-family: 'Inter', sans-serif;
          line-height: 1.65;
          margin: 0;
        }

        /* ── CTA ── */
        .cta-section {
          padding: 6rem 1.5rem;
          text-align: center;
        }

        .cta-card {
          background: #0f766e;
          border-radius: 28px;
          padding: 4rem 2rem;
          max-width: 720px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
        }

        .cta-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 60%);
        }

        .cta-title {
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.03em;
          margin: 0 0 1rem;
          position: relative;
        }

        .cta-desc {
          color: rgba(255,255,255,0.75);
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          margin: 0 auto 2rem;
          max-width: 440px;
          line-height: 1.7;
          position: relative;
        }

        .btn-cta {
          background: #fff;
          color: #0f766e;
          padding: 0.9rem 2.5rem;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: transform 0.15s, box-shadow 0.2s;
          position: relative;
        }

        .btn-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        /* ── FOOTER ── */
        .home-footer {
          border-top: 1px solid #e8e2d8;
          padding: 2rem 1.5rem;
          text-align: center;
          font-size: 0.8rem;
          color: #9ca3af;
          font-family: 'Inter', sans-serif;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .features-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .hero { padding: 5rem 1.25rem 3rem; }
          .cta-card { padding: 3rem 1.5rem; }
          .trust-bar { gap: 1rem; }
        }
      `}</style>

      <div className="home-root">

        {/* ── HERO ── */}
        <section className="hero">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Assistant juridique intelligent pour entrepreneurs
          </div>

          <h1 className="hero-title">
            Créez votre société
            <br />
            <span className="hero-title-accent">sans stress, en minutes</span>
          </h1>

          <p className="hero-desc">
            L'assistant IA vous guide étape par étape, collecte vos informations et génère vos statuts juridiques prêts à déposer.
          </p>

          <div className="hero-actions">
            <Link href="/assistant" className="btn-hero-primary">
              Commencer maintenant →
            </Link>
            <Link href="/auth" className="btn-hero-secondary">
              Se connecter
            </Link>
          </div>

          <div className="trust-bar">
            {[
              "Gratuit pour commencer",
              "Statuts générés en PDF",
              "SASU, SAS, SARL, EURL, SCI",
              "Données sécurisées",
            ].map((item) => (
              <div key={item} className="trust-item">
                <div className="trust-check">✓</div>
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="features-section">
          <p className="section-eyebrow">Fonctionnalités</p>
          <h2 className="section-title">Tout ce qu'il faut pour créer votre société</h2>
          <p className="section-desc">
            De la première question à la génération du PDF, on s'occupe de tout.
          </p>

          <div className="features-grid">
            {[
              {
                icon: "🤖",
                title: "Assistant IA guidé",
                desc: "Un chatbot juridique vous pose les bonnes questions une par une, dans le bon ordre, sans jargon inutile.",
              },
              {
                icon: "📄",
                title: "Statuts automatiques",
                desc: "Vos statuts sont générés instantanément en PDF, adaptés à votre forme juridique — SASU, SAS, SARL, EURL ou SCI.",
              },
              {
                icon: "📁",
                title: "Dossiers sauvegardés",
                desc: "Tous vos dossiers sont stockés et accessibles depuis votre dashboard. Reprenez où vous en étiez à tout moment.",
              },
              {
                icon: "✅",
                title: "Validation en temps réel",
                desc: "Chaque champ est vérifié à la saisie. Erreurs, avertissements et confirmations pour un dossier toujours propre.",
              },
              {
                icon: "⚖️",
                title: "Conforme au droit français",
                desc: "Les statuts générés respectent les dispositions légales en vigueur pour chaque type de société.",
              },
              {
                icon: "🔒",
                title: "Données sécurisées",
                desc: "Authentification Supabase, données chiffrées, accès strictement personnel. Votre dossier n'appartient qu'à vous.",
              },
            ].map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── STEPS ── */}
        <section className="steps-section">
          <div className="steps-inner">
            <p className="section-eyebrow">Comment ça marche</p>
            <h2 className="section-title">4 étapes pour lancer votre société</h2>

            <div className="steps-list">
              <div className="steps-line" />
              {[
                {
                  n: "1",
                  title: "Choisissez votre forme juridique",
                  desc: "SASU, SAS, SARL, EURL ou SCI — l'assistant vous aide à choisir si vous avez un doute.",
                },
                {
                  n: "2",
                  title: "Répondez aux questions",
                  desc: "Nom, activité, capital, dirigeant, siège social... L'IA collecte toutes les infos nécessaires en conversation naturelle.",
                },
                {
                  n: "3",
                  title: "Vérifiez votre dossier",
                  desc: "Consultez le récapitulatif structuré, modifiez les champs si besoin, confirmez que tout est correct.",
                },
                {
                  n: "4",
                  title: "Téléchargez vos statuts en PDF",
                  desc: "Un document juridique complet, mis en page, prêt à signer et à déposer au greffe.",
                },
              ].map((step) => (
                <div key={step.n} className="step-row">
                  <div className="step-circle">{step.n}</div>
                  <div className="step-body">
                    <h3 className="step-title">{step.title}</h3>
                    <p className="step-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-section">
          <div className="cta-card">
            <h2 className="cta-title">Prêt à créer votre société ?</h2>
            <p className="cta-desc">
              Lancez votre dossier maintenant. C'est gratuit, rapide et aucune connaissance juridique n'est requise.
            </p>
            <Link href="/assistant" className="btn-cta">
              Démarrer l'assistant →
            </Link>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="home-footer">
          <p>© {new Date().getFullYear()} Legal AI — Création d'entreprise assistée par IA</p>
        </footer>
      </div>
    </>
  );
}