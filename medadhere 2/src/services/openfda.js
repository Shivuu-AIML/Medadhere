const BASE_URL = 'https://api.fda.gov/drug/label.json';

// Pulls the raw "drug_interactions" section from the FDA label for a drug.
// Free, no API key needed. Tries brand name first, then generic name.
async function getInteractionText(drugName) {
  const fields = ['openfda.brand_name', 'openfda.generic_name'];

  for (const field of fields) {
    const url = `${BASE_URL}?search=${field}:"${encodeURIComponent(drugName)}"&limit=1`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const result = data.results && data.results[0];
      if (result && result.drug_interactions) {
        return result.drug_interactions[0];
      }
    } catch (err) {
      continue; // try the next field rather than failing the whole check
    }
  }

  return null; // no label data found — caller should handle this gracefully
}

module.exports = { getInteractionText };
