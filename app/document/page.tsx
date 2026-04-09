"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Company = {
  id?: number;
  type?: string;
  name?: string;
  activity?: string;
  address?: string;
  capital?: string;
  director?: string;
  duration?: string;
  actions?: string;
  exerciseStart?: string;
  exerciseEnd?: string;
  exercise_start?: string;
  exercise_end?: string;
};

type Warning = { level: "error" | "warning" | "info"; title: string; message: string };
type Article = { title: string; content: string | string[] };
type DocStatus = "idle" | "generating" | "done" | "error";

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const empty: Company = {
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

function normalize(raw: Record<string, string | null | undefined>): Company {
  return {
    ...empty,
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

function v(str?: string, fallback = "—"): string {
  return String(str || "").trim() || fallback;
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toOfficialName(s: string): string {
  const t = s.trim();
  if (!t || t === "—") return t;
  return toTitleCase(t);
}

function parseCapital(s: string): number {
  return Number(s.replace(/[€\s]/g, "").replace(",", ".")) || 0;
}

function fmtNum(n: number): string {
  return n.toLocaleString("fr-FR");
}

function cleanDate(s: string): string {
  return s.replace(/[!'"`;|]/g, "").trim();
}

function pluralShares(n: number, shares: string): string {
  if (shares === "parts sociales") {
    return n <= 1 ? `${fmtNum(n)} part sociale` : `${fmtNum(n)} parts sociales`;
  }
  return n <= 1 ? `${fmtNum(n)} action` : `${fmtNum(n)} actions`;
}

function getMeta(type: string) {
  const t = type.toUpperCase();
  const isSARL = t === "SARL" || t === "EURL" || t === "SCI";
  const isSingle = t === "SASU" || t === "EURL";

  return {
    t,
    isSARL,
    isSingle,
    isSCI: t === "SCI",
    fullLabel:
      t === "SASU"
        ? "Société par actions simplifiée unipersonnelle"
        : t === "SAS"
          ? "Société par actions simplifiée"
          : t === "SARL"
            ? "Société à responsabilité limitée"
            : t === "EURL"
              ? "Entreprise unipersonnelle à responsabilité limitée"
              : t === "SCI"
                ? "Société civile immobilière"
                : "Société",
    shortTitle:
      t === "SASU"
        ? "Statuts de SASU"
        : t === "SAS"
          ? "Statuts de SAS"
          : t === "SARL"
            ? "Statuts de SARL"
            : t === "EURL"
              ? "Statuts d'EURL"
              : t === "SCI"
                ? "Statuts de SCI"
                : "Statuts",
    manager: isSARL ? "Gérant" : "Président",
    managerLow: isSARL ? "gérant" : "président",
    shares: isSARL ? "parts sociales" : "actions",
  };
}

// ─── Génération articles (identique à la version précédente) ─────────────────

function buildArticles(company: Company, meta: ReturnType<typeof getMeta>): Article[] {
  const name = v(company.name, "[Nom de la société]");
  const activity = v(company.activity, "[activité principale]");
  const address = v(company.address, "[adresse du siège]");
  const duration = v(company.duration, "99 ans");
  const director = toOfficialName(v(company.director, "[Nom du dirigeant]"));
  const capitalNum = parseCapital(v(company.capital, "0"));
  const capitalEur = `${fmtNum(capitalNum)} €`;
  const capitalStr = `${fmtNum(capitalNum)} euros`;
  const actionsNum = Number(v(company.actions, "1").replace(/\s/g, "")) || 1;
  const sharesStr = pluralShares(actionsNum, meta.shares);
  const nominalValue =
    actionsNum > 0 ? fmtNum(Math.round((capitalNum / actionsNum) * 100) / 100) : "—";
  const exerciseStart = cleanDate(v(company.exerciseStart, "1er janvier"));
  const exerciseEnd = cleanDate(v(company.exerciseEnd, "31 décembre"));

  const forme = (): Article => ({
    title: "Forme",
    content:
      meta.t === "SASU"
        ? `Il est formé entre l'associé unique soussigné une société par actions simplifiée unipersonnelle (SASU), régie par les articles L. 227-1 et suivants du Code de commerce, ainsi que par les présents statuts.`
        : meta.t === "SAS"
          ? `Il est formé entre les propriétaires d'actions ci-après créées une société par actions simplifiée (SAS), régie par les articles L. 227-1 et suivants du Code de commerce, ainsi que par les présents statuts.`
          : meta.t === "SARL"
            ? `Il est formé entre les associés soussignés une société à responsabilité limitée (SARL), régie par les articles L. 223-1 et suivants du Code de commerce, ainsi que par les présents statuts.`
            : meta.t === "EURL"
              ? `Il est formé par l'associé unique soussigné une entreprise unipersonnelle à responsabilité limitée (EURL), régie par les articles L. 223-1 et suivants du Code de commerce, ainsi que par les présents statuts.`
              : `Il est formé entre les associés soussignés une société civile immobilière (SCI), régie par les articles 1832 et suivants du Code civil, ainsi que par les présents statuts.`,
  });

  const denomination = (): Article => ({
    title: "Dénomination sociale",
    content: `La société prend pour dénomination sociale : « ${name} ». Cette dénomination devra figurer sur tous les actes et documents émanant de la société, précédée ou suivie des mots « ${meta.t} » et de l'indication du capital social.`,
  });

  const objet = (): Article =>
    meta.isSCI
      ? {
          title: "Objet social",
          content: [
            "l'acquisition, l'administration, la gestion et la location de tous biens et droits immobiliers",
            "la construction, la rénovation et l'aménagement de biens immobiliers",
            "et plus généralement, toutes opérations civiles se rattachant directement ou indirectement à cet objet, à condition qu'elles ne modifient pas le caractère civil de la société",
          ],
        }
      : {
          title: "Objet social",
          content: `La société a pour objet, en France et à l'étranger : ${activity}. Et plus généralement, toutes opérations industrielles, commerciales, financières, mobilières ou immobilières pouvant se rattacher directement ou indirectement à l'objet social défini ci-dessus, ou susceptibles d'en faciliter la réalisation.`,
        };

  const siege = (): Article => ({
    title: "Siège social",
    content: `Le siège social est établi à : ${address}. Il pourra être transféré en tout autre endroit de la même ville par simple décision du ${meta.managerLow}, et partout ailleurs par décision ${meta.isSingle ? "de l'associé unique" : "de la collectivité des associés"}.`,
  });

  const duree = (): Article => ({
    title: "Durée",
    content: `La durée de la société est fixée à ${duration} à compter de la date de son immatriculation au Registre du Commerce et des Sociétés, sauf dissolution anticipée ou prorogation.`,
  });

  const capital = (): Article => ({
    title: "Capital social",
    content: meta.isSCI
      ? `Le capital social est fixé à ${capitalEur}. Il est divisé en ${sharesStr} de ${nominalValue} € chacune, attribuées aux associés en proportion de leurs apports respectifs.`
      : `Le capital social est fixé à la somme de ${capitalStr} (${capitalEur}). Il est divisé en ${sharesStr} de ${nominalValue} € chacune, toutes de même catégorie, entièrement souscrites et intégralement libérées par ${meta.isSingle ? "l'associé unique" : "les associés"}.`,
  });

  const exercice = (): Article => ({
    title: "Exercice social",
    content: `L'exercice social commence le ${exerciseStart} et se termine le ${exerciseEnd} de chaque année.`,
  });

  const comptes = (): Article => ({
    title: "Comptes sociaux",
    content: `À la clôture de chaque exercice social, le ${meta.managerLow} établit les comptes annuels (bilan, compte de résultat, annexe) conformément aux dispositions légales. Ces documents sont soumis à l'approbation ${meta.isSingle ? "de l'associé unique" : "des associés"} dans les six mois suivant la clôture.`,
  });

  const resultat = (): Article => ({
    title: "Affectation du résultat",
    content: `Sur les bénéfices nets de l'exercice, il est prélevé cinq pour cent pour constituer la réserve légale jusqu'à ce qu'elle atteigne un dixième du capital social. Le solde est ${meta.isSingle ? "affecté par l'associé unique" : "réparti entre les associés proportionnellement à leurs droits"} selon les décisions prises dans les conditions prévues par les présents statuts.`,
  });

  const dissolution = (): Article => ({
    title: "Dissolution — Liquidation",
    content: `La société est dissoute à l'expiration de sa durée ou dans les cas prévus par la loi. La liquidation est effectuée par un liquidateur désigné par ${meta.isSingle ? "l'associé unique" : "les associés"}. Le boni de liquidation est ${meta.isSingle ? "attribué à l'associé unique" : "réparti entre les associés proportionnellement à leurs droits"}.`,
  });

  const contestations = (): Article => ({
    title: "Contestations",
    content: `Toutes contestations relatives aux affaires sociales seront soumises aux juridictions compétentes du ressort du siège social, sauf disposition légale contraire.`,
  });

  if (meta.t === "SASU") {
    return [
      forme(),
      denomination(),
      objet(),
      siege(),
      duree(),
      capital(),
      {
        title: "Actions",
        content:
          "Les actions sont nominatives et indivisibles à l'égard de la société. En cas d'indivision, les propriétaires indivis sont représentés par un mandataire unique. Toute cession doit être constatée par écrit.",
      },
      {
        title: "Associé unique",
        content:
          "La société est constituée par un associé unique qui détient la totalité des actions. L'associé unique exerce l'ensemble des pouvoirs dévolus à la collectivité des actionnaires. Ses décisions sont consignées dans un registre tenu au siège social.",
      },
      {
        title: "Président",
        content: `La société est dirigée par un Président, personne physique ou morale. Le premier Président désigné aux présentes est : ${director}. Il est investi des pouvoirs les plus étendus pour agir en toute circonstance au nom de la société dans la limite de l'objet social.`,
      },
      {
        title: "Pouvoirs du Président",
        content:
          "Le Président représente la société à l'égard des tiers. Il peut déléguer une partie de ses pouvoirs à toute personne de son choix. Il est révocable à tout moment par l'associé unique.",
      },
      {
        title: "Décisions de l'associé unique",
        content:
          "L'associé unique prend seul les décisions relevant de la compétence de la collectivité des actionnaires. Ces décisions sont répertoriées dans un registre spécial. Lorsque l'associé unique est également Président, l'approbation des comptes résulte du dépôt au registre du commerce dans le délai légal.",
      },
      exercice(),
      comptes(),
      resultat(),
      dissolution(),
      contestations(),
    ];
  }

  if (meta.t === "SAS") {
    return [
      forme(),
      denomination(),
      objet(),
      siege(),
      duree(),
      capital(),
      {
        title: "Actions",
        content:
          "Les actions sont nominatives et indivisibles à l'égard de la société. La propriété résulte de leur inscription en compte au nom de leur titulaire dans les registres tenus par la société.",
      },
      {
        title: "Cession et transmission des actions",
        content:
          "Les actions sont librement cessibles entre associés. Toute cession à un tiers est soumise à l'agrément préalable des associés statuant à la majorité des deux tiers. En cas de refus, les associés s'obligent à racheter les actions dans un délai de trois mois.",
      },
      {
        title: "Président",
        content: `La société est dirigée par un Président, personne physique ou morale, associé ou non. Le premier Président désigné aux présentes est : ${director}. Il est nommé pour une durée indéterminée.`,
      },
      {
        title: "Pouvoirs du Président",
        content:
          "Le Président est investi des pouvoirs les plus étendus pour agir en toute circonstance au nom de la société dans la limite de l'objet social. Il représente la société à l'égard des tiers et peut consentir toutes délégations de pouvoirs.",
      },
      {
        title: "Décisions collectives",
        content:
          "Les décisions collectives sont prises en assemblée générale. Les décisions ordinaires sont adoptées à la majorité simple. Les décisions extraordinaires (modification des statuts, dissolution) requièrent une majorité des deux tiers.",
      },
      {
        title: "Droit de vote",
        content:
          "Chaque action donne droit à une voix. Tout associé peut se faire représenter par un autre associé muni d'un pouvoir écrit.",
      },
      exercice(),
      comptes(),
      resultat(),
      dissolution(),
      contestations(),
    ];
  }

  if (meta.t === "SARL") {
    return [
      forme(),
      denomination(),
      objet(),
      siege(),
      duree(),
      capital(),
      {
        title: "Parts sociales",
        content:
          "Les parts sociales sont nominatives et indivisibles à l'égard de la société. Chaque part donne droit à une fraction des bénéfices et de l'actif net social proportionnellement au nombre de parts existantes.",
      },
      {
        title: "Cession de parts sociales",
        content:
          "Les parts sont librement cessibles entre associés. Toute cession à un tiers est soumise à l'agrément préalable des associés représentant au moins la majorité des parts. En cas de refus, les associés disposent de trois mois pour racheter les parts.",
      },
      {
        title: "Gérant",
        content: `La société est gérée par un ou plusieurs gérants, personnes physiques, associés ou non. Le premier gérant désigné aux présentes est : ${director}. Il est nommé pour une durée indéterminée.`,
      },
      {
        title: "Pouvoirs du Gérant",
        content:
          "Le gérant est investi des pouvoirs les plus étendus pour agir en toute circonstance au nom de la société dans la limite de l'objet social. Il représente la société à l'égard des tiers. Toute limitation de ses pouvoirs est inopposable aux tiers de bonne foi.",
      },
      {
        title: "Assemblées générales",
        content:
          "Les décisions collectives sont prises en assemblée, convoquée au moins quinze jours avant la réunion. Chaque part donne droit à une voix. Les décisions ordinaires sont adoptées à la majorité simple. Les décisions extraordinaires requièrent les trois quarts des parts.",
      },
      exercice(),
      comptes(),
      resultat(),
      dissolution(),
      contestations(),
    ];
  }

  if (meta.t === "EURL") {
    return [
      forme(),
      denomination(),
      objet(),
      siege(),
      duree(),
      capital(),
      {
        title: "Parts sociales",
        content:
          "Le capital social est représenté par des parts sociales nominatives, indivisibles à l'égard de la société. L'associé unique détient la totalité des parts sociales.",
      },
      {
        title: "Gérant",
        content: `La société est gérée par un gérant, personne physique, associé ou non. Le premier gérant désigné aux présentes est : ${director}. Il est nommé pour une durée indéterminée.`,
      },
      {
        title: "Pouvoirs du Gérant",
        content:
          "Le gérant est investi des pouvoirs les plus étendus pour agir en toute circonstance au nom de la société dans la limite de l'objet social. Il peut déléguer une partie de ses pouvoirs à tout tiers de son choix.",
      },
      {
        title: "Décisions de l'associé unique",
        content:
          "L'associé unique exerce seul les pouvoirs normalement dévolus à la collectivité des associés. Ses décisions sont consignées dans un registre spécial. Lorsque le gérant est l'associé unique, l'approbation des comptes résulte du dépôt au registre du commerce dans le délai légal.",
      },
      exercice(),
      comptes(),
      resultat(),
      dissolution(),
      contestations(),
    ];
  }

  return [
    forme(),
    denomination(),
    objet(),
    siege(),
    duree(),
    {
      title: "Apports",
      content: `Chaque associé apporte à la société des fonds en numéraire. Le montant total des apports constitue le capital social fixé à ${capitalEur}.`,
    },
    capital(),
    {
      title: "Cession de parts sociales",
      content:
        "Les parts sociales ne peuvent être cédées qu'avec l'agrément de la majorité des associés en nombre et en capital. En cas de refus, les associés sont tenus de racheter les parts dans un délai de trois mois.",
    },
    {
      title: "Gérant",
      content: `La société est administrée par un ou plusieurs gérants. Le premier gérant désigné aux présentes est : ${director}. Il est nommé pour une durée indéterminée.`,
    },
    {
      title: "Pouvoirs du Gérant",
      content:
        "Le gérant est investi des pouvoirs les plus étendus pour agir au nom de la société dans les limites de l'objet social, notamment acquérir, vendre, louer tous biens immobiliers, contracter tous emprunts, consentir toutes hypothèques.",
    },
    {
      title: "Assemblées des associés",
      content:
        "Les associés se réunissent au moins une fois par an. Chaque part donne droit à une voix. Les décisions ordinaires sont prises à la majorité des parts. Les modifications statutaires requièrent l'accord unanime des associés.",
    },
    exercice(),
    comptes(),
    {
      title: "Affectation du résultat",
      content:
        "Le résultat est réparti entre les associés proportionnellement à leurs parts sociales, ou affecté en réserve par décision de l'assemblée générale.",
    },
    dissolution(),
    contestations(),
  ];
}

// ─── Avertissements ───────────────────────────────────────────────────────────

function buildWarnings(company: Company, meta: ReturnType<typeof getMeta>): Warning[] {
  const warns: Warning[] = [];
  const actionsNum = Number(v(company.actions, "1").replace(/\s/g, "")) || 1;
  const capitalNum = parseCapital(v(company.capital, "0"));
  const activity = v(company.activity, "");
  const director = v(company.director, "");
  const name = v(company.name, "");

  if (activity !== "—" && activity.split(/\s+/).length < 5) {
    warns.push({
      level: "error",
      title: "Objet social trop limité",
      message: `"${activity}" est trop court. Un objet social trop restrictif peut bloquer votre activité et provoquer un refus au greffe. Retournez dans l'assistant pour l'élargir.`,
    });
  }

  if (!meta.isSingle && actionsNum === 1) {
    warns.push({
      level: "warning",
      title: `1 seule ${meta.shares === "parts sociales" ? "part sociale" : "action"}`,
      message: `En ${meta.t}, avoir une seule ${meta.shares === "parts sociales" ? "part" : "action"} rend impossible toute répartition du capital. Recommandation : 100 ou 1 000 ${meta.shares}.`,
    });
  }

  if (director !== "—" && director === director.toLowerCase()) {
    warns.push({
      level: "info",
      title: "Nom reformaté automatiquement",
      message: `"${director}" a été converti en "${toOfficialName(director)}" pour respecter le format officiel.`,
    });
  }

  if (capitalNum > 0 && capitalNum < 100 && !meta.isSCI) {
    warns.push({
      level: "warning",
      title: "Capital social très faible",
      message: `Un capital de ${capitalNum} € est légalement valide mais peu crédible. Un minimum de 1 000 € est conseillé.`,
    });
  }

  if (
    name !== "—" &&
    activity !== "—" &&
    name.toLowerCase().includes("tech") &&
    (activity.toLowerCase().includes("bonbon") || activity.toLowerCase().includes("alimentaire"))
  ) {
    warns.push({
      level: "error",
      title: "Incohérence nom / activité",
      message: `Le nom "${name}" suggère une activité tech mais l'objet social décrit "${activity}". Cette incohérence peut provoquer un refus au greffe.`,
    });
  }

  if (meta.t === "SARL" && actionsNum <= 2) {
    warns.push({
      level: "warning",
      title: "SARL avec très peu de parts",
      message: `Une SARL avec ${actionsNum} part${actionsNum > 1 ? "s" : ""} est peu adaptée. Si vous êtes seul, préférez l'EURL.`,
    });
  }

  return warns;
}

// ─── Génération PDF ───────────────────────────────────────────────────────────

async function generateStatutsPdf(
  company: Company,
  meta: ReturnType<typeof getMeta>,
  articles: Article[]
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210,
    pageH = 297,
    mx = 20,
    cw = 170;
  let y = 0;
  const teal: [number, number, number] = [15, 118, 110],
    dark: [number, number, number] = [17, 24, 39],
    gray: [number, number, number] = [107, 114, 128],
    light: [number, number, number] = [248, 247, 244],
    border: [number, number, number] = [229, 231, 235],
    white: [number, number, number] = [255, 255, 255];

  const capitalNum = parseCapital(v(company.capital, "0"));
  const actionsNum = Number(v(company.actions, "1").replace(/\s/g, "")) || 1;
  const directorFmt = toOfficialName(v(company.director));
  const capitalFmt = `${fmtNum(capitalNum)} €`;
  const sharesFmt = pluralShares(actionsNum, meta.shares);
  const exStart = cleanDate(v(company.exerciseStart));
  const exEnd = cleanDate(v(company.exerciseEnd));

  const footer = () => {
    const pg = (doc as any).internal.getNumberOfPages();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(`${v(company.name)} — ${meta.shortTitle} — Page ${pg}`, pageW / 2, pageH - 8, {
      align: "center",
    });
    doc.setDrawColor(...border);
    doc.line(mx, pageH - 12, pageW - mx, pageH - 12);
  };

  const newPage = () => {
    footer();
    doc.addPage();
    doc.setFillColor(...teal);
    doc.rect(0, 0, pageW, 11, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...white);
    doc.text(`${v(company.name)} — ${meta.shortTitle}`, mx, 7.5);
    doc.text(new Date().toLocaleDateString("fr-FR"), pageW - mx, 7.5, { align: "right" });
    y = 20;
  };

  const check = (n: number) => {
    if (y + n > pageH - 18) newPage();
  };

  doc.setFillColor(...teal);
  doc.rect(0, 0, pageW, 52, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...white);
  doc.text(meta.fullLabel.toUpperCase(), pageW / 2, 14, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(v(company.name, "Société"), pageW / 2, 27, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(meta.shortTitle.toUpperCase(), pageW / 2, 38, { align: "center" });
  doc.setFontSize(7);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, pageW / 2, 47, {
    align: "center",
  });
  y = 60;

  doc.setFillColor(...light);
  doc.roundedRect(mx, y, cw, 56, 3, 3, "F");
  const recap = [
    ["Forme", meta.fullLabel],
    ["Dénomination", v(company.name)],
    ["Objet social", v(company.activity)],
    ["Siège social", v(company.address)],
    ["Capital social", capitalFmt],
    [meta.manager, directorFmt],
    ["Durée", v(company.duration)],
    [meta.shares === "parts sociales" ? "Parts sociales" : "Actions", sharesFmt],
    ["Exercice social", `${exStart} → ${exEnd}`],
  ];
  let fy = y + 7;
  recap.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...gray);
    doc.text(label, mx + 3, fy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    doc.text(doc.splitTextToSize(value, cw - 52)[0], mx + 50, fy);
    fy += 5.8;
  });
  y += 63;
  doc.setDrawColor(...teal);
  doc.setLineWidth(0.5);
  doc.line(mx, y, pageW - mx, y);
  y += 8;

  articles.forEach((article, i) => {
    const bodyText = Array.isArray(article.content)
      ? article.content.map((l, idx) => `${idx + 1}. ${l}`).join("\n")
      : article.content;
    const lines = doc.splitTextToSize(bodyText, cw);
    check(10 + lines.length * 5.2 + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...teal);
    doc.text(`Article ${i + 1} — ${article.title}`, mx, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    doc.text(lines, mx, y);
    y += lines.length * 5.2 + 5;
    if (i < articles.length - 1) {
      doc.setDrawColor(...border);
      doc.setLineWidth(0.15);
      doc.line(mx, y - 1, pageW - mx, y - 1);
    }
  });

  check(50);
  y += 4;
  doc.setDrawColor(...teal);
  doc.setLineWidth(0.5);
  doc.line(mx, y, pageW - mx, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text("Fait à _________________________, le _________________________", mx, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(`${meta.manager} : ${directorFmt}`, mx, y);
  y += 12;
  doc.setFontSize(8);
  doc.text("Signature :", mx, y);
  doc.setDrawColor(...border);
  doc.rect(mx + 18, y - 4, 65, 20);

  const total = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(`${v(company.name)} — ${meta.shortTitle} — Page ${p} / ${total}`, pageW / 2, pageH - 8, {
      align: "center",
    });
    if (p > 1) {
      doc.setDrawColor(...border);
      doc.line(mx, pageH - 12, pageW - mx, pageH - 12);
    }
  }

  doc.save(`statuts-${(company.name || "societe").toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

async function generateAttestationPdf(company: Company, meta: ReturnType<typeof getMeta>) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210,
    pageH = 297,
    mx = 25,
    cw = 160;
  const teal: [number, number, number] = [15, 118, 110],
    dark: [number, number, number] = [17, 24, 39],
    gray: [number, number, number] = [107, 114, 128],
    border: [number, number, number] = [229, 231, 235];
  const director = toOfficialName(v(company.director, "[Nom du dirigeant]"));
  const name = v(company.name, "[Nom de la société]");

  doc.setFillColor(...teal);
  doc.rect(0, 0, pageW, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("Lexia — Vos statuts en minutes", mx, 5.5);
  doc.text(new Date().toLocaleDateString("fr-FR"), pageW - mx, 5.5, { align: "right" });

  let y = 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...dark);
  doc.text("ATTESTATION SUR L'HONNEUR", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text("DE NON-CONDAMNATION ET DE FILIATION", pageW / 2, y + 4, { align: "center" });
  y += 14;

  doc.setFillColor(248, 247, 244);
  doc.roundedRect(mx, y, cw, 14, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(
    "Conformément à l'article L. 223-7 du Code de commerce et au décret n° 2021-1329",
    mx + 4,
    y + 5
  );
  doc.text("relatif à la formalité unique pour les entreprises.", mx + 4, y + 10);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...dark);
  const intro = `Je soussigné(e), ${director}, né(e) le _________________________ à _________________________,`;
  const lines1 = doc.splitTextToSize(intro, cw);
  doc.text(lines1, mx, y);
  y += lines1.length * 6 + 4;

  doc.text(`demeurant à : ${v(company.address, "[adresse personnelle]")}`, mx, y);
  y += 8;

  const qual = `agissant en qualité de ${meta.managerLow} de la société « ${name} » (${meta.t}),`;
  const lines2 = doc.splitTextToSize(qual, cw);
  doc.text(lines2, mx, y);
  y += lines2.length * 6 + 8;

  doc.setFont("helvetica", "bold");
  doc.text("ATTESTE SUR L'HONNEUR :", mx, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  const declarations = [
    "1. Ne pas avoir fait l'objet, depuis moins de cinq ans, d'une condamnation définitive pour l'un des crimes ou délits prévus aux articles L. 241-3 et L. 242-6 du Code de commerce ;",
    "2. Ne pas avoir fait l'objet d'une mesure d'interdiction de gérer prévue aux articles L. 653-2, L. 653-4, L. 653-5, L. 653-6, L. 653-8 et L. 653-11 du Code de commerce ;",
    "3. Ne pas avoir fait l'objet, depuis moins de cinq ans, d'une condamnation définitive en application des articles 313-1 à 313-3, 314-1 à 314-3 et 324-1 à 324-6 du Code pénal ;",
    "4. Ne pas être sous le coup d'une interdiction d'exercice d'une profession commerciale ou libérale.",
  ];

  declarations.forEach((decl) => {
    const dl = doc.splitTextToSize(decl, cw);
    if (y + dl.length * 5.5 > pageH - 30) {
      doc.addPage();
      y = 20;
    }
    doc.text(dl, mx, y);
    y += dl.length * 5.5 + 5;
  });

  y += 8;
  doc.setDrawColor(...border);
  doc.line(mx, y, pageW - mx, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...dark);
  doc.text("FILIATION", mx, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.text(`Nom et prénom du père : _________________________________________________`, mx, y);
  y += 8;
  doc.text(`Nom et prénom de la mère : ______________________________________________`, mx, y);
  y += 16;

  doc.setDrawColor(...border);
  doc.line(mx, y, pageW - mx, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(`Fait à _________________________, le _________________________`, mx, y);
  y += 10;
  doc.text(`${director}`, mx, y);
  y += 6;
  doc.setFontSize(8);
  doc.text(
    "Signature (précédée de la mention manuscrite « Lu et approuvé ») :",
    mx,
    y
  );
  y += 4;
  doc.setDrawColor(...border);
  doc.rect(mx, y, 80, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(
    "Ce document est généré à titre indicatif. Il doit être daté et signé de votre main avant dépôt.",
    pageW / 2,
    pageH - 8,
    { align: "center" }
  );

  doc.save(
    `attestation-non-condamnation-${(company.name || "societe").toLowerCase().replace(/\s+/g, "-")}.pdf`
  );
}

async function generateDbePdf(company: Company, meta: ReturnType<typeof getMeta>) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210,
    pageH = 297,
    mx = 25,
    cw = 160;
  const teal: [number, number, number] = [15, 118, 110],
    dark: [number, number, number] = [17, 24, 39],
    gray: [number, number, number] = [107, 114, 128],
    border: [number, number, number] = [229, 231, 235],
    light: [number, number, number] = [248, 247, 244];
  const director = toOfficialName(v(company.director, "[Nom du dirigeant]"));
  const name = v(company.name, "[Nom de la société]");
  const capitalNum = parseCapital(v(company.capital, "0"));

  doc.setFillColor(...teal);
  doc.rect(0, 0, pageW, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("Lexia — Vos statuts en minutes", mx, 5.5);
  doc.text(new Date().toLocaleDateString("fr-FR"), pageW - mx, 5.5, { align: "right" });

  let y = 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text("DÉCLARATION DES BÉNÉFICIAIRES EFFECTIFS", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text("(DBE — Article L. 561-46 du Code monétaire et financier)", pageW / 2, y + 4, {
    align: "center",
  });
  y += 14;

  doc.setFillColor(...light);
  doc.roundedRect(mx, y, cw, 16, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(
    "Ce formulaire doit être déposé au Registre du Commerce et des Sociétés (RCS) lors de",
    mx + 4,
    y + 5
  );
  doc.text("l'immatriculation de la société, puis mis à jour en cas de modification.", mx + 4, y + 10);
  doc.text("Référence : Décret n° 2017-1094 du 12 juin 2017.", mx + 4, y + 15);
  y += 22;

  doc.setFillColor(...teal);
  doc.roundedRect(mx, y, cw, 7, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("SECTION 1 — IDENTIFICATION DE LA SOCIÉTÉ", mx + 4, y + 5);
  y += 13;

  const s1fields = [
    ["Dénomination sociale", name],
    ["Forme juridique", meta.fullLabel],
    ["Siège social", v(company.address)],
    ["Capital social", `${fmtNum(capitalNum)} €`],
    ["SIREN / RCS", "À compléter après immatriculation"],
  ];

  s1fields.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    doc.text(label + " :", mx, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(val, cw - 45);
    doc.text(lines, mx + 45, y);
    y += lines.length * 5 + 3;
  });
  y += 5;

  doc.setFillColor(...teal);
  doc.roundedRect(mx, y, cw, 7, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("SECTION 2 — BÉNÉFICIAIRE EFFECTIF N°1", mx + 4, y + 5);
  y += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  doc.text(
    "Est considéré comme bénéficiaire effectif toute personne physique détenant, directement ou",
    mx,
    y
  );
  y += 5;
  doc.text(
    "indirectement, plus de 25% du capital ou des droits de vote, ou exerçant un contrôle.",
    mx,
    y
  );
  y += 10;

  const s2fields = [
    ["Nom et prénom", director],
    ["Date de naissance", "À compléter"],
    ["Lieu de naissance", "À compléter"],
    ["Nationalité", "Française (ou à préciser)"],
    ["Adresse personnelle", v(company.address)],
    ["% capital détenu", "À compléter (ex : 100%)"],
    ["% droits de vote", "À compléter (ex : 100%)"],
    ["Qualité", "Gérant / Associé unique"],
  ];

  s2fields.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);
    doc.text(label + " :", mx, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(val, cw - 55);
    doc.text(lines, mx + 55, y);
    y += lines.length * 5 + 3;
  });
  y += 8;

  doc.setFillColor(248, 247, 244);
  doc.roundedRect(mx, y, cw, 14, 2, 2, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(
    "Si d'autres personnes détiennent plus de 25% du capital ou des droits de vote,",
    mx + 4,
    y + 5
  );
  doc.text(
    "reproduire une section supplémentaire pour chaque bénéficiaire effectif.",
    mx + 4,
    y + 10
  );
  y += 20;

  doc.setDrawColor(...border);
  doc.line(mx, y, pageW - mx, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text("CERTIFICATION", mx, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  const certText =
    "Je certifie que les informations déclarées ci-dessus sont exactes et sincères.";
  doc.text(doc.splitTextToSize(certText, cw), mx, y);
  y += 10;
  doc.text(`Fait à _________________________, le _________________________`, mx, y);
  y += 8;
  doc.text(`${meta.manager} : ${director}`, mx, y);
  y += 8;
  doc.setFontSize(8);
  doc.text("Signature :", mx, y);
  doc.setDrawColor(...border);
  doc.rect(mx + 18, y - 4, 70, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(
    "Ce document est généré à titre indicatif. Complétez les champs manquants avant dépôt au greffe.",
    pageW / 2,
    pageH - 8,
    { align: "center" }
  );

  doc.save(
    `dbe-beneficiaires-effectifs-${(company.name || "societe").toLowerCase().replace(/\s+/g, "-")}.pdf`
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

const WHATSAPP_NUMBER = "33780954094";

function DocumentPageContent() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("id");

  const [company, setCompany] = useState<Company>(empty);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [docStatus, setDocStatus] = useState<{
    statuts: DocStatus;
    attestation: DocStatus;
    dbe: DocStatus;
  }>({ statuts: "idle", attestation: "idle", dbe: "idle" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (companyId) {
        const supabase = createClient();
        const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).single();

        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setCompany(normalize(data));
        localStorage.setItem("companyData", JSON.stringify(data));
        setLoading(false);
        return;
      }

      const saved = localStorage.getItem("companyData");
      if (saved) {
        try {
          setCompany(normalize(JSON.parse(saved)));
        } catch {
          setNotFound(true);
        }
      } else {
        setNotFound(true);
      }

      setLoading(false);
    };

    load();
  }, [companyId]);

  const meta = useMemo(() => getMeta(company.type || "SASU"), [company.type]);
  const articles = useMemo(() => buildArticles(company, meta), [company, meta]);
  const warnings = useMemo(() => buildWarnings(company, meta), [company, meta]);

  const completionCount = useMemo(
    () =>
      [
        company.type,
        company.name,
        company.activity,
        company.address,
        company.capital,
        company.director,
        company.duration,
        company.actions,
        company.exerciseStart,
        company.exerciseEnd,
      ].filter((x) => String(x || "").trim()).length,
    [company]
  );

  const progress = Math.round((completionCount / 10) * 100);
  const errorsCount = warnings.filter((w) => w.level === "error").length;
  const canDownload = completionCount === 10 && errorsCount === 0;

  const capitalNum = parseCapital(v(company.capital, "0"));
  const actionsNum = Number(v(company.actions, "1").replace(/\s/g, "")) || 1;
  const directorFormatted = toOfficialName(v(company.director));
  const capitalFormatted = `${fmtNum(capitalNum)} €`;
  const sharesFormatted = pluralShares(actionsNum, meta.shares);
  const exerciseStartClean = cleanDate(v(company.exerciseStart));
  const exerciseEndClean = cleanDate(v(company.exerciseEnd));

  const handleDownload = async (type: "statuts" | "attestation" | "dbe") => {
    if (!canDownload) return;

    setDocStatus((prev) => ({ ...prev, [type]: "generating" }));

    try {
      if (type === "statuts") await generateStatutsPdf(company, meta, articles);
      else if (type === "attestation") await generateAttestationPdf(company, meta);
      else await generateDbePdf(company, meta);

      setDocStatus((prev) => ({ ...prev, [type]: "done" }));
    } catch (err) {
      console.error(err);
      setDocStatus((prev) => ({ ...prev, [type]: "error" }));
    }
  };

  const whatsappMsg = encodeURIComponent(
    `Bonjour, j'ai généré mes statuts pour ma ${meta.t} "${v(company.name)}" avec Lexia et je souhaite finaliser la création complète jusqu'au Kbis. Pouvez-vous m'accompagner ?`
  );
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`;

  const checklistItems = [
    { label: "Statuts générés", done: canDownload },
    { label: "Attestation de non-condamnation", done: docStatus.attestation === "done" },
    { label: "Déclaration bénéficiaires effectifs (DBE)", done: docStatus.dbe === "done" },
    { label: "Dépôt du capital en banque", done: false },
    { label: "Annonce légale", done: false },
    { label: "Dossier INPI / Guichet unique", done: false },
    { label: "Pièce d'identité du dirigeant", done: false },
    { label: "Justificatif de domiciliation", done: false },
    { label: "Kbis reçu", done: false },
  ];

  const doneCount = checklistItems.filter((i) => i.done).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4ee] flex items-center justify-center">
        <div className="premium-card rounded-[32px] p-12 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#0f766e] border-t-transparent" />
          <p className="text-slate-600 font-medium">Chargement du dossier...</p>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#f7f4ee] flex items-center justify-center px-6">
        <div className="premium-card rounded-[32px] p-12 text-center max-w-md">
          <div className="text-4xl mb-4">📂</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Aucun dossier trouvé</h1>
          <p className="text-slate-500 mb-6">
            Commencez par créer une société avec l'assistant IA.
          </p>
          <button
            onClick={() => (window.location.href = "/assistant")}
            className="premium-button w-full"
          >
            Créer une société
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee]">
      <div className="mx-auto max-w-[1450px] px-4 py-6 md:px-6 lg:px-8 space-y-6">
        <div className="premium-card rounded-[32px] p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="premium-badge">{meta.fullLabel}</span>
              <h1 className="premium-title mt-3 text-4xl font-bold">{v(company.name)}</h1>
              <p className="premium-muted mt-1 text-lg">
                {meta.shortTitle} · {articles.length} articles
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  window.location.href = company.id ? `/assistant?id=${company.id}` : "/assistant";
                }}
                className="premium-button-secondary px-6"
              >
                ✏️ Modifier
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="premium-button-secondary px-6"
              >
                ← Dashboard
              </button>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-500">Complétude du dossier</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#ebe5db]">
              <div
                className="h-full rounded-full bg-[#0f766e] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="space-y-3">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-4 flex gap-3 ${
                  w.level === "error"
                    ? "bg-red-50 border-red-200"
                    : w.level === "warning"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-blue-50 border-blue-200"
                }`}
              >
                <span className="text-lg flex-shrink-0">
                  {w.level === "error" ? "🔴" : w.level === "warning" ? "⚠️" : "ℹ️"}
                </span>
                <div>
                  <p
                    className={`font-semibold text-sm ${
                      w.level === "error"
                        ? "text-red-800"
                        : w.level === "warning"
                          ? "text-amber-800"
                          : "text-blue-800"
                    }`}
                  >
                    {w.title}
                  </p>
                  <p
                    className={`text-sm mt-0.5 font-sans ${
                      w.level === "error"
                        ? "text-red-700"
                        : w.level === "warning"
                          ? "text-amber-700"
                          : "text-blue-700"
                    }`}
                  >
                    {w.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{ background: "linear-gradient(135deg,#0f766e 0%,#0d9488 100%)" }}
          className="rounded-[28px] p-8 text-white relative overflow-hidden"
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -20,
              left: -20,
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
            }}
          />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 999,
                  padding: "4px 14px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  fontFamily: "Inter,sans-serif",
                  letterSpacing: "0.06em",
                }}
              >
                OFFRE COMPLÈTE
              </span>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold leading-tight">
                On s'occupe de tout,
                <br />
                jusqu'à votre Kbis
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: "Inter,sans-serif",
                  fontSize: "0.9rem",
                  marginTop: "0.5rem",
                  lineHeight: 1.6,
                }}
              >
                Dépôt de capital · Annonce légale · Dossier INPI · Suivi complet
                <br />
                Vous n'avez rien à faire — on gère tout pour vous.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {["Zéro stress", "Délais optimisés", "Accompagnement personnalisé", "Jusqu'au Kbis"].map(
                  (tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: 999,
                        padding: "3px 10px",
                        fontSize: "0.72rem",
                        fontFamily: "Inter,sans-serif",
                      }}
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#25D366",
                color: "white",
                borderRadius: 16,
                padding: "1rem 2rem",
                fontWeight: 700,
                fontSize: "1rem",
                fontFamily: "Inter,sans-serif",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                whiteSpace: "nowrap",
                flexShrink: 0,
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Créer ma société maintenant
            </a>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="premium-card rounded-[28px] p-6">
              <div className="mb-5">
                <p className="text-sm text-slate-500">Pack complet</p>
                <h2 className="text-2xl font-bold text-slate-900">Vos documents</h2>
                <p className="text-sm text-slate-500 mt-1 font-sans">
                  Téléchargez chaque document et complétez les champs manquants avant dépôt.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "statuts" as const,
                    icon: "📄",
                    title: "Statuts constitutifs",
                    desc: `${meta.shortTitle} · ${articles.length} articles complets · PDF mis en page`,
                    badge: "Personnalisé",
                  },
                  {
                    key: "attestation" as const,
                    icon: "✍️",
                    title: "Attestation de non-condamnation",
                    desc: "Pré-remplie avec vos données · À signer à la main",
                    badge: "Pré-rempli",
                  },
                  {
                    key: "dbe" as const,
                    icon: "👤",
                    title: "Déclaration des bénéficiaires effectifs (DBE)",
                    desc: "Formulaire pré-rempli · À compléter et signer",
                    badge: "Pré-rempli",
                  },
                ].map((doc) => {
                  const status = docStatus[doc.key];
                  return (
                    <div
                      key={doc.key}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-[#e8e2d8] bg-[#fafaf8] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{doc.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 text-sm">{doc.title}</p>
                            <span
                              style={{
                                background: "#f0fdf4",
                                color: "#059669",
                                border: "1px solid #a7f3d0",
                                borderRadius: 999,
                                padding: "1px 8px",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                fontFamily: "Inter,sans-serif",
                              }}
                            >
                              {doc.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-sans mt-0.5">{doc.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(doc.key)}
                        disabled={!canDownload || status === "generating"}
                        style={{
                          flexShrink: 0,
                          background:
                            status === "done" ? "#059669" : canDownload ? "#0f766e" : "#e5e7eb",
                          color: canDownload || status === "done" ? "white" : "#9ca3af",
                          border: "none",
                          borderRadius: 12,
                          padding: "0.5rem 1rem",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          fontFamily: "Inter,sans-serif",
                          cursor: canDownload && status !== "generating" ? "pointer" : "not-allowed",
                          transition: "all 0.15s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {status === "generating"
                          ? "⏳ Génération..."
                          : status === "done"
                            ? "✓ Téléchargé"
                            : "⬇ Télécharger"}
                      </button>
                    </div>
                  );
                })}

                <div className="rounded-2xl border border-[#e8e2d8] bg-[#fafaf8] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Check-list INPI</p>
                      <p className="text-xs text-slate-500 font-sans">
                        Référence pour votre dossier au guichet unique
                      </p>
                    </div>
                    <span
                      style={{
                        marginLeft: "auto",
                        background: "#eff6ff",
                        color: "#3b82f6",
                        border: "1px solid #bfdbfe",
                        borderRadius: 999,
                        padding: "1px 8px",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        fontFamily: "Inter,sans-serif",
                      }}
                    >
                      Gratuit
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {checklistItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: item.done ? "#10b981" : "#e5e7eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {item.done && (
                            <svg width="8" height="8" viewBox="0 0 10 10" fill="white">
                              <path d="M2 5l2.5 2.5L8 3" />
                            </svg>
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: item.done ? "#059669" : "#374151",
                            fontFamily: "Inter,sans-serif",
                            fontWeight: item.done ? 600 : 400,
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#ece6db]">
                    <div className="flex justify-between text-xs font-sans text-slate-500">
                      <span>Progression</span>
                      <span className="font-semibold text-slate-900">
                        {doneCount}/{checklistItems.length}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#ebe5db]">
                      <div
                        className="h-full rounded-full bg-[#0f766e] transition-all duration-500"
                        style={{ width: `${Math.round((doneCount / checklistItems.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {!canDownload && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 font-sans">
                  ⚠️{" "}
                  {errorsCount > 0
                    ? `Corrigez les ${errorsCount} erreur(s) ci-dessus avant de télécharger.`
                    : `Complétez tous les champs dans l'assistant (${completionCount}/10).`}
                </div>
              )}
            </div>

            <div className="premium-card rounded-[28px] p-8 md:p-10">
              <div className="mb-8 border-b border-[#ece6db] pb-6 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Aperçu document</p>
                <h2 className="mt-3 text-2xl font-bold uppercase tracking-tight">
                  {meta.shortTitle}
                </h2>
                <p className="mt-2 text-lg font-semibold text-[#0f766e]">
                  {v(company.name, "[Nom de la société]")}
                </p>
              </div>

              <div className="mb-8 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Forme juridique", value: meta.fullLabel },
                  { label: "Dénomination sociale", value: v(company.name) },
                  { label: "Objet social", value: v(company.activity) },
                  { label: "Siège social", value: v(company.address) },
                  { label: "Capital social", value: capitalFormatted },
                  { label: meta.manager, value: directorFormatted },
                  { label: "Durée", value: v(company.duration) },
                  {
                    label: `Nombre de ${meta.shares}`,
                    value: sharesFormatted,
                  },
                  {
                    label: "Exercice social",
                    value: `Du ${exerciseStartClean} au ${exerciseEndClean}`,
                    colSpan: true,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[16px] bg-[#fcfbf8] p-4 ring-1 ring-[#ece6db] ${
                      "colSpan" in item && item.colSpan ? "sm:col-span-2" : ""
                    }`}
                  >
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="mt-1 font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                {articles.map((article, index) => (
                  <section key={index}>
                    <h3 className="mb-2 flex items-center gap-3 text-base font-bold text-slate-900">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      {article.title}
                    </h3>
                    {Array.isArray(article.content) ? (
                      <ul className="space-y-1.5 pl-4">
                        {article.content.map((line, li) => (
                          <li
                            key={li}
                            className="flex gap-2 text-slate-700 leading-6 font-sans text-sm"
                          >
                            <span className="text-[#0f766e] font-bold flex-shrink-0">·</span>
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-700 leading-7 font-sans text-sm">{article.content}</p>
                    )}
                    {index < articles.length - 1 && <div className="mt-5 border-b border-[#ece6db]" />}
                  </section>
                ))}
              </div>

              <div className="mt-10 border-t border-[#ece6db] pt-6">
                <h3 className="mb-4 text-base font-bold text-slate-900">Signatures</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Fait à</p>
                    <div className="h-10 rounded-xl border border-dashed border-[#d1c8ba] bg-[#fcfbf8]" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Le</p>
                    <div className="h-10 rounded-xl border border-dashed border-[#d1c8ba] bg-[#fcfbf8]" />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-slate-500 mb-2">
                      {meta.manager} : {directorFormatted}
                    </p>
                    <div className="h-20 rounded-xl border border-dashed border-[#d1c8ba] bg-[#fcfbf8]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4 h-fit">
            <div className="premium-card rounded-[28px] p-5">
              <p className="text-sm text-slate-500">Récapitulatif</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{v(company.name)}</h2>
              <div className="mt-3 space-y-2">
                {[
                  { label: "Forme", value: meta.t },
                  { label: "Capital", value: capitalFormatted },
                  { label: meta.manager, value: directorFormatted },
                  { label: "Durée", value: v(company.duration) },
                  { label: meta.shares === "parts sociales" ? "Parts" : "Actions", value: sharesFormatted },
                  { label: "Exercice", value: `${exerciseStartClean} → ${exerciseEndClean}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-[#ece6db] bg-[#fcfbf8] px-3 py-2">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {errorsCount > 0 && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
                    🔴 {errorsCount} erreur{errorsCount > 1 ? "s" : ""} bloquante{errorsCount > 1 ? "s" : ""}
                  </div>
                )}
                {warnings.filter((w) => w.level === "warning").length > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-medium">
                    ⚠️ {warnings.filter((w) => w.level === "warning").length} avertissement
                    {warnings.filter((w) => w.level === "warning").length > 1 ? "s" : ""}
                  </div>
                )}
                {warnings.length === 0 && progress === 100 && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 font-medium">
                    ✅ Dossier complet
                  </div>
                )}
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                background: "#25D366",
                borderRadius: 20,
                padding: "1.25rem",
                textDecoration: "none",
                transition: "transform 0.15s,box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,211,102,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span
                  style={{
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    fontFamily: "Inter,sans-serif",
                  }}
                >
                  Finaliser avec un expert
                </span>
              </div>
              <p
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "0.78rem",
                  fontFamily: "Inter,sans-serif",
                  lineHeight: 1.5,
                }}
              >
                Dépôt capital · Annonce légale · INPI · Kbis
                <br />
                On gère tout, vous recevez votre Kbis.
              </p>
            </a>

            <div className="premium-card rounded-[28px] p-5">
              <p className="text-sm text-slate-500 mb-3">Plan des statuts</p>
              <div className="space-y-1">
                {articles.map((article, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    <span className="w-5 h-5 rounded-full bg-[#f0fdf4] text-[#0f766e] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-slate-600 truncate">{article.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function DocumentPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f4ee] flex items-center justify-center">
          <div className="premium-card rounded-[32px] p-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#0f766e] border-t-transparent" />
            <p className="text-slate-600 font-medium">Chargement du dossier...</p>
          </div>
        </main>
      }
    >
      <DocumentPageContent />
    </Suspense>
  );
}