// Turns raw FDA label text into a short, plain-language interaction warning.
// If no OPENAI_API_KEY is set, falls back to a keyword-based heuristic so
// the demo never breaks during judging, even without AI access.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function summarizeInteraction(drugA, drugB, rawTextA, rawTextB) {
  const combinedText = [rawTextA, rawTextB].filter(Boolean).join('\n\n');

  if (!combinedText) {
    return {
      severity: 'unknown',
      summary: `No interaction data found in FDA labels for ${drugA} and ${drugB}. This does not guarantee they are safe together — check with a pharmacist.`,
    };
  }

  if (!OPENAI_API_KEY) {
    return heuristicSummary(drugA, drugB, combinedText);
  }

  const prompt = `You are a careful medical information assistant, not a doctor.
Given this FDA label text about drug interactions involving ${drugA} and ${drugB}:

"""${combinedText.slice(0, 1500)}"""

Respond with ONLY raw JSON, no markdown fences, in exactly this shape:
{"severity": "low|moderate|high", "summary": "one or two plain-English sentences a patient could understand, including one practical tip"}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('AI summarization failed, falling back to heuristic:', err.message);
    return heuristicSummary(drugA, drugB, combinedText);
  }
}

// Simple keyword-based fallback — no AI required
function heuristicSummary(drugA, drugB, text) {
  const lower = text.toLowerCase();
  let severity = 'moderate';
  if (lower.includes('contraindicated') || lower.includes('severe') || lower.includes('do not use')) {
    severity = 'high';
  } else if (lower.includes('minor') || lower.includes('mild')) {
    severity = 'low';
  }
  return {
    severity,
    summary: `${drugA} and ${drugB} may interact, based on FDA label data (estimated severity: ${severity}). Talk to your pharmacist before combining them.`,
  };
}

module.exports = { summarizeInteraction };
