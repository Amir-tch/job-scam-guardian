import { createClient } from "@supabase/supabase-js";
import { SALARY_BENCHMARKS } from "../../lib/salaryBenchmarks";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODEL = "gemini-3.8-flash";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request) {
  try {
    if (!GEMINI_API_KEY) {
      return Response.json(
        {
          error: "GEMINI_API_KEY is missing.",
          details:
            "Make sure GEMINI_API_KEY exists in your .env.local file.",
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
    } = body;

    if (!messageText || messageText.trim().length < 10) {
      return Response.json(
        {
          error: "Please provide the job offer message text.",
        },
        { status: 400 }
      );
    }

    const { data: matches, error: matchError } = await supabase.rpc(
      "match_similar_check",
      {
        input_text: messageText,
        threshold: 0.55,
      }
    );

    if (matchError) {
      console.error("Similarity match error:", matchError);
    }

    if (matches && matches.length > 0) {
      const match = matches[0];

      let summary = match.summary;

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
        matchedPrevious: true,
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
      });

      if (dbError) {
        console.error("Supabase insert error:", dbError);
      }

      return Response.json(analysis);
    }

    const prompt = `
You are a job scam detection analyst focused on Nigeria and remote job offers.

Analyze the following job offer for potential scam indicators.

JOB OFFER MESSAGE:
"""
${messageText}
"""

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

Return ONLY valid JSON using exactly this structure:

{
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
`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],

      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    let response;
    let data;

    for (let attempt = 1; attempt <= 5; attempt++) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify(requestBody),
        }
      );

      data = await response.json();

      console.log(
        `Gemini attempt ${attempt}:`,
        response.status
      );

      if (response.ok) {
        break;
      }

      const errorMessage =
        data?.error?.message || "";

      const isTemporaryError =
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        errorMessage.toLowerCase().includes("high demand") ||
        errorMessage.toLowerCase().includes("temporarily");

      if (!isTemporaryError || attempt === 5) {
        break;
      }

      await sleep(attempt * 4000);
    }

    console.log(
      "Gemini response:",
      JSON.stringify(data, null, 2)
    );

    if (!response.ok) {
      const message =
        data?.error?.message ||
        "Unknown Gemini API error.";

      return Response.json(
        {
          error: "Gemini API request failed.",
          details: message,
        },
        {
          status: response.status,
        }
      );
    }

    const generatedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return Response.json(
        {
          error: "Gemini returned an empty response.",
          details: JSON.stringify(data),
        },
        { status: 500 }
      );
    }

    let analysis;

    try {
      analysis = JSON.parse(generatedText);
    } catch (parseError) {
      console.error(
        "JSON parsing error:",
        parseError
      );

      console.error(
        "Gemini returned:",
        generatedText
      );

      return Response.json(
        {
          error: "Gemini returned invalid JSON.",
          details: generatedText,
        },
        { status: 500 }
      );
    }

    const { error: dbError } = await supabase.from("checks").insert({
      message_text: messageText,
      company_name: companyName || null,
      sender_domain: senderDomain || null,
      risk_score: analysis.riskScore,
      risk_level: analysis.riskLevel,
      summary: analysis.summary,
      flags: analysis.flags,
      user_id: userId || null,
    });

    if (dbError) {
      console.error("Supabase insert error:", dbError);
    }

    return Response.json(analysis);

  } catch (error) {
    console.error(
      "Analysis error:",
      error
    );

    return Response.json(
      {
        error: "Analysis failed.",
        details:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}