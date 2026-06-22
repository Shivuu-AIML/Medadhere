// Minimal Google Identity Services helper (client-side)
// Used by public/index.html when user clicks “Continue with Google”.

let googleInitialized = false;

function ensureGoogleScriptLoaded() {
  return new Promise((resolve, reject) => {
    if (googleInitialized) return resolve();

    const existing = document.querySelector('script[data-google-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }

    const script = document.createElement('script');
    script.dataset.googleGis = 'true';

    // Google GIS: https://developers.google.com/identity/gsi/web
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleInitialized = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));

    document.head.appendChild(script);
  });
}

async function googleSignIn({ onToken, onError }) {
  try {
    await ensureGoogleScriptLoaded();

    // client id is provided via global var injected by index.html
    const clientId = window.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('Missing GOOGLE_CLIENT_ID');

    // Initialize only once.
    if (!window.__gisInited) {
      window.__gisInited = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          // response.credential is the ID token
          if (response && response.credential) onToken(response.credential);
          else onError(new Error('No Google credential received'));
        },
      });

      // Optional: render invisible prompt. We’ll still use prompt() for button click.
      window.google.accounts.id.renderButton(document.getElementById('google-btn-placeholder'), { theme: 'outline', size: 'large' });
    }

    window.google.accounts.id.prompt();
  } catch (e) {
    onError(e);
  }
}

window.googleSignIn = googleSignIn;

