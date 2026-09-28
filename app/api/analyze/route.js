import { createClient } from "@supabase/supabase-js";
import { SALARY_BENCHMARKS } from "../../lib/salaryBenchmarks";

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
];

const EMBEDDING_MODEL = "gemini-embedding-001";
const SIMILARITY_THRESHOLD = 0.86;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNextPacificMidnight() {
  const now = new Date();
  const pacificString = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  const pacificNow = new Date(pacificString);
  const nextMidnightPacific = new Date(pacificNow);
  nextMidnightPacific.setHours(24, 0, 0, 0);
  const offsetMs = now.getTime() - pacificNow.getTime();
  return new Date(nextMidnightPacific.getTime() + offsetMs);
}

async function isExhausted(keyIndex, model) {
  const { data } = await supabase
    .from("api_exhaustion")
    .select("exhausted_until")
    .eq("key_index", keyIndex)
    .eq("model", model)
    .maybeSingle();

  if (!data) return false;
  return new Date(data.exhausted_until) > new Date();
}

async function markExhausted(keyIndex, model) {
  const until = getNextPacificMidnight();
  await supabase.from("api_exhaustion").upsert({
    key_index: keyIndex,
    model,
    exhausted_until: until.toISOString(),
  });
}

function isRateLimitOrQuotaError(status, errorMessage) {
  const msg = (errorMessage || "").toLowerCase();
  return (
    status === 429 ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted")
  );
}

function isModelUnavailableError(status, errorMessage) {
  const msg = (errorMessage || "").toLowerCase();
  return (
    status === 404 ||
    status === 400 ||
    msg.includes("not found") ||
    msg.includes("not supported") ||
    msg.includes("does not exist")
  );
}

async function callWithKeyRotation(url, requestBody, model) {
  let lastResponse;
  let lastData;

  for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
    const key = API_KEYS[keyIndex];

    if (model && (await isExhausted(keyIndex, model))) {
      console.log(`Key ${keyIndex + 1} + ${model} cached as exhausted, skipping.`);
      continue;
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      lastResponse = response;
      lastData = data;

      console.log(`Key ${keyIndex + 1}, attempt ${attempt}:`, response.status);

      if (response.ok) {
        return { response, data };
      }

      const errorMessage = data?.error?.message || "";

      if (isModelUnavailableError(response.status, errorMessage)) {
        return { response, data, unavailable: true };
      }

      if (isRateLimitOrQuotaError(response.status, errorMessage)) {
        console.log(`Key ${keyIndex + 1} rate limited, caching and trying next key.`);
        if (model) await markExhausted(keyIndex, model);
        break;
      }

      const isTemporaryError =
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        errorMessage.toLowerCase().includes("high demand") ||
        errorMessage.toLowerCase().includes("temporarily");

      if (!isTemporaryError || attempt === 3) {
        break;
      }

      await sleep(attempt * 4000);
    }
  }

  return { response: lastResponse, data: lastData };
}

async function callGeminiWithModelFallback(requestBody) {
  let lastResult;

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    console.log(`Trying model: ${model}`);

    const result = await callWithKeyRotation(url, requestBody, model);
    lastResult = result;

    if (result.response?.ok) {
      return result;
    }

    if (!result.unavailable) {
      const errorMessage = result.data?.error?.message || "";
      if (!isRateLimitOrQuotaError(result.response?.status, errorMessage)) {
        return result;
      }
    }

    console.log(`Model ${model} unavailable or exhausted, trying next model.`);
  }

  return lastResult;
}

async function getEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

  const { response, data } = await callWithKeyRotation(
    url,
    {
      content: { parts: [{ text }] },
      taskType: "SEMANTIC_SIMILARITY",
      outputDimensionality: 768,
    },
    EMBEDDING_MODEL
  );

  if (!response?.ok || !data?.embedding?.values) {
    console.error("Embedding error:", data);
    return null;
  }

  return data.embedding.values;
}

const RESPONSE_SCHEMA_INSTRUCTIONS = `
Return ONLY valid JSON using exactly this structure:

{
  "extractedText": "",
  "riskScore": 0,
  "riskLevel": "low",
  "flags": [
    {
      "category": "Chat-only interview",
      "detected": false,
      "evidence": "",
      "explanation": ""
    }
  ],
  "summary": ""
}

"extractedText" must contain the exact job offer text found in the input (transcribed from the image if one was provided, or the original message text if plain text was provided). Do not summarize or paraphrase it, transcribe it as written.
`;

function buildAnalysisInstructions(companyName, senderDomain) {
  return `
You are a job scam detection analyst focused on Nigeria and remote job offers.

Analyze the job offer provided (as text, or as an image containing a job offer message) for potential scam indicators.

COMPANY CLAIMED:
${companyName || "Not provided"}

SENDER DOMAIN:
${senderDomain || "Not provided"}

Use this salary benchmark data to judge the "Implausible salary" category:

${SALARY_BENCHMARKS}

Check these seven categories:

1. Chat-only interview
2. Upfront payment request
3. Implausible salary
4. Urgency pressure
5. Domain mismatch
6. Task-based pay scam pattern
7. Sensitive personal information request

For every category:

- detected must be true or false
- if detected is true, provide an exact quote from the message as evidence
- if detected is false, evidence must be an empty string
- explanation must be written in simple English
- for the Implausible salary category specifically, explicitly reference the benchmark range for the closest matching role when explaining your reasoning

Only use information actually present in the message.

Do not invent evidence.

Calculate a riskScore from 0 to 100 based on the number and seriousness of the detected indicators.

Use:

0-39 = low
40-69 = medium
70-100 = high

The result is an educational risk assessment.

Do not claim with certainty that a person or company is fraudulent.

${RESPONSE_SCHEMA_INSTRUCTIONS}
`;
}

export async function POST(request) {
  try {
    if (API_KEYS.length === 0) {
      return Response.json(
        {
          error: "Service configuration error.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const {
      messageText,
      companyName,
      senderDomain,
      userId,
      imageBase64,
      imageMimeType,
    } = body;

    const hasImage = !!imageBase64;
    const hasText = messageText && messageText.trim().length >= 10;

    if (!hasImage && !hasText) {
      return Response.json(
        {
          error: "Please provide a job offer message or an image.",
        },
        { status: 400 }
      );
    }

    let embeddingString = null;

    if (hasText && !hasImage) {
      const embedding = await getEmbedding(messageText);
      embeddingString = embedding ? `[${embedding.join(",")}]` : null;

      if (embeddingString) {
        const { data: matches, error: matchError } = await supabase.rpc(
          "match_similar_check",
          {
            query_embedding: embeddingString,
            match_threshold: SIMILARITY_THRESHOLD,
          }
        );

        if (matchError) {
          console.error("Similarity match error:", matchError);
        }

        if (
          matches &&
          matches.length > 0 &&
          matches[0].similarity_score >= SIMILARITY_THRESHOLD
        ) {
          const match = matches[0];

          let summary = match.summary;
          let matchedPrevious = true;

          if (
            (match.company_name && match.company_name !== companyName) ||
            (match.sender_domain && match.sender_domain !== senderDomain)
          ) {
            summary += ` This message closely matches a job offer reported earlier${
              match.company_name ? ` under the company name "${match.company_name}"` : ""
            }${
              match.sender_domain ? ` and sender domain "${match.sender_domain}"` : ""
            }. Scammers often reuse the same message template with small changes.`;
          }

          const analysis = {
            riskScore: match.risk_score,
            riskLevel: match.risk_level,
            flags: match.flags,
            summary,
            matchedPrevious,
          };

          const { error: dbError } = await supabase.from("checks").insert({
            message_text: messageText,
            company_name: companyName || null,
            sender_domain: senderDomain || null,
            risk_score: analysis.riskScore,
            risk_level: analysis.riskLevel,
            summary: analysis.summary,
            flags: analysis.flags,
            user_id: userId || null,
            embedding: embeddingString,
          });

          if (dbError) {
            console.error("Supabase insert error:", dbError);
          }

          return Response.json(analysis);
        }
      }
    }

    const instructions = buildAnalysisInstructions(companyName, senderDomain);

    const parts = [];

    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType || "image/jpeg",
          data: imageBase64,
        },
      });
      parts.push({ text: instructions });
    } else {
      parts.push({
        text: `JOB OFFER MESSAGE:\n"""\n${messageText}\n"""\n\n${instructions}`,
      });
    }

    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const { response, data } = await callGeminiWithModelFallback(requestBody);

    if (!response?.ok) {
      return Response.json(
        {
          error: "Request failed. Please try again.",
        },
        {
          status: response?.status || 500,
        }
      );
    }

    const generatedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return Response.json(
        {
          error: "No response received. Please try again.",
        },
        { status: 500 }
      );
    }

    let analysis;

    try {
      analysis = JSON.parse(generatedText);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw response:", generatedText);

      return Response.json(
        {
          error: "Unexpected response format. Please try again.",
        },
        { status: 500 }
      );
    }

    const finalMessageText = analysis.extractedText || messageText || "";

    if (hasImage && finalMessageText) {
      const embedding = await getEmbedding(finalMessageText);
      embeddingString = embedding ? `[${embedding.join(",")}]` : null;
    }

    const { error: dbError } = await supabase.from("checks").insert({
      message_text: finalMessageText,
      company_name: companyName || null,
      sender_domain: senderDomain || null,
      risk_score: analysis.riskScore,
      risk_level: analysis.riskLevel,
      summary: analysis.summary,
      flags: analysis.flags,
      user_id: userId || null,
      embedding: embeddingString,
    });

    if (dbError) {
      console.error("Supabase insert error:", dbError);
    }

    return Response.json({
      ...analysis,
      messageText: finalMessageText,
    });

  } catch (error) {
    console.error("Analysis error:", error);

    return Response.json(
      {
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}