const BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

// Looks up the RxCUI (NIH standard drug code) for a given drug name.
// Free, no API key needed. Returns null if not found.
async function getRxCui(drugName) {
  const url = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(drugName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RxNorm lookup failed for ${drugName}`);
  const data = await res.json();
  const idGroup = data.idGroup || {};
  return idGroup.rxnormId ? idGroup.rxnormId[0] : null;
}

module.exports = { getRxCui };
