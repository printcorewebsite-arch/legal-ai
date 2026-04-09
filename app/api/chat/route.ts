import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  duration?: string;
  actions?: string;
  exerciseStart?: string;
  exerciseEnd?: string;
};

const emptyFormData: FormData = {
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

const fieldOrder: (keyof FormData)[] = [
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

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeFormData(input?: FormData): FormData {
  return {
    ...emptyFormData,
    ...input,
  };
}

function mergeFormData(current: FormData, extracted: Partial<FormData>) {
  const merged = { ...current };

  for (const key of fieldOrder) {
    const value = normalizeText(extracted[key]);
    if (value) {
      merged[key] = value;
    }
  }

  return merged;
}

function getCompanyTypeMeta(type?: string) {
  const normalized = normalizeText(type).toUpperCase();

  const isSAS = normalized === "SAS" || normalized === "SASU";
  const isSARL = normalized === "SARL" || normalized === "EURL";
  const isSCI = normalized === "SCI";
  const isSingle = normalized === "SASU" || normalized === "EURL";

  const managerLabel = isSARL || isSCI ? "gérant" : "président";
  const sharesLabel = isSARL || isSCI ? "parts sociales" : "actions";

  return {
    normalized,
    isSAS,
    isSARL,
    isSCI,
    isSingle,
    managerLabel,
    sharesLabel,
  };
}

function getNextMissingField(formData: FormData): keyof FormData | null {
  for (const field of fieldOrder) {
    if (!normalizeText(formData[field])) {
      return field;
    }
  }
  return null;
}

function getQuestionForField(field: keyof FormData, type?: string) {
  const meta = getCompanyTypeMeta(type);

  switch (field) {
    case "type":
      return "Quel type de société souhaitez-vous créer ? Vous pouvez choisir par exemple : SASU, SAS, EURL, SARL ou SCI.";

    case "name":
      return "Quel est le nom de votre société ?";

    case "activity":
      return "Quelle sera l’activité principale de la société ?";

    case "address":
      return "Quelle est l’adresse du siège social ?";

    case "capital":
      return "Quel est le montant du capital social ?";

    case "director":
      return `Quel est le nom du ${meta.managerLabel} de la société ?`;

    case "duration":
      return "Quelle est la durée de la société ? En général, on choisit souvent 99 ans.";

    case "actions":
      return `Combien de ${meta.sharesLabel} souhaitez-vous prévoir ?`;

    case "exerciseStart":
      return "Quelle est la date de début de l’exercice social ?";

    case "exerciseEnd":
      return "Quelle est la date de fin de l’exercice social ?";

    default:
      return "Pouvez-vous préciser cette information ?";
  }
}

function getQuickContext(type?: string) {
  const meta = getCompanyTypeMeta(type);

  return `
Contexte juridique :
- Type détecté : ${meta.normalized || "non défini"}
- Représentant légal attendu : ${meta.managerLabel}
- Répartition du capital : ${meta.sharesLabel}
- Structure unipersonnelle : ${meta.isSingle ? "oui" : "non"}

Règles de langage :
- Si type = SASU ou SAS : parler de président et d'actions.
- Si type = SARL ou EURL : parler de gérant et de parts sociales.
- Si type = SCI : parler de gérant et de parts sociales.
- Répondre de façon claire, professionnelle, courte et rassurante.
- Toujours poser UNE seule prochaine question à la fois.
- Ne jamais redemander une information déjà connue.
`;
}

function buildExtractionPrompt(messages: ChatMessage[], formData: FormData) {
  const latestUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";

  return `
Tu es un extracteur de données juridiques.
Ta mission : extraire depuis le dernier message utilisateur les informations structurées pour un dossier de création d’entreprise.

Données déjà connues :
${JSON.stringify(formData, null, 2)}

Dernier message utilisateur :
"""${latestUserMessage}"""

Champs possibles :
- type
- name
- activity
- address
- capital
- director
- duration
- actions
- exerciseStart
- exerciseEnd

Règles :
- Retourne uniquement un JSON valide.
- N’invente rien.
- Si une information n’est pas présente, laisse-la vide.
- Garde les valeurs exactement telles qu’exprimées par l’utilisateur quand c’est possible.
- Si l’utilisateur donne plusieurs infos en une phrase, extrais-les toutes.

Format attendu :
{
  "type": "",
  "name": "",
  "activity": "",
  "address": "",
  "capital": "",
  "director": "",
  "duration": "",
  "actions": "",
  "exerciseStart": "",
  "exerciseEnd": ""
}
`;
}

function buildAssistantPrompt(
  messages: ChatMessage[],
  formData: FormData,
  extracted: Partial<FormData>
) {
  const merged = mergeFormData(formData, extracted);
  const nextField = getNextMissingField(merged);
  const nextQuestion = nextField
    ? getQuestionForField(nextField, merged.type)
    : "Parfait. Toutes les informations nécessaires sont remplies. Vous pouvez maintenant confirmer les informations puis générer les statuts.";

  const recapLines = fieldOrder
    .map((field) => {
      const value = normalizeText(merged[field]);
      return `${field}: ${value || "-"}`;
    })
    .join("\n");

  const latestUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";

  return `
Tu es un assistant juridique français spécialisé dans la création de société.

${getQuickContext(merged.type)}

Données actuelles du dossier :
${recapLines}

Informations extraites du dernier message :
${JSON.stringify(extracted, null, 2)}

Dernier message utilisateur :
"""${latestUserMessage}"""

Ta mission :
1. Accuser réception brièvement des informations nouvelles.
2. Reformuler sobrement si utile.
3. Poser la prochaine question utile selon les données manquantes.
4. Si tout est rempli, inviter à confirmer puis générer les statuts.

Contraintes de style :
- Réponse courte à moyenne.
- Français naturel, professionnel et rassurant.
- Pas de liste à puces.
- Pas de JSON.
- Pas de markdown compliqué.
- Une seule prochaine question.
- Si le type n’est pas encore connu, demander d’abord le type.
- Adapter le vocabulaire au type : président/gérant, actions/parts sociales.

Question suivante attendue :
${nextQuestion}
`;
}

async function extractStructuredData(
  messages: ChatMessage[],
  formData: FormData
): Promise<Partial<FormData>> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildExtractionPrompt(messages, formData),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw);

    return {
      type: normalizeText(parsed.type),
      name: normalizeText(parsed.name),
      activity: normalizeText(parsed.activity),
      address: normalizeText(parsed.address),
      capital: normalizeText(parsed.capital),
      director: normalizeText(parsed.director),
      duration: normalizeText(parsed.duration),
      actions: normalizeText(parsed.actions),
      exerciseStart: normalizeText(parsed.exerciseStart),
      exerciseEnd: normalizeText(parsed.exerciseEnd),
    };
  } catch (error) {
    console.error("Erreur parsing extraction JSON:", error);
    return {};
  }
}

async function generateAssistantReply(
  messages: ChatMessage[],
  formData: FormData,
  extracted: Partial<FormData>
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: buildAssistantPrompt(messages, formData, extracted),
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
  });

  return (
    completion.choices[0]?.message?.content ||
    "Merci. Continuons avec la prochaine information."
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = (body.messages || []) as ChatMessage[];
    const formData = normalizeFormData(body.formData);

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages manquants." },
        { status: 400 }
      );
    }

    const extracted = await extractStructuredData(messages, formData);
    const reply = await generateAssistantReply(messages, formData, extracted);

    return NextResponse.json({
      reply,
      extracted,
    });
  } catch (error) {
    console.error("Erreur /api/chat:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}