/**
 * GG BANK - Environment & Deployment Configuration
 * ============================================================================
 * Allows runtime and deployment configuration of the Backend API Endpoint.
 * 
 * 1. LOCALHOST DEVELOPMENT:
 *    Defaults automatically to http://localhost:8080/api.
 * 
 * 2. VERCEL PRODUCTION DEPLOYMENT:
 *    Option A (Recommended): Set Vercel Project Environment Variable:
 *      VITE_API_BASE_URL = https://<YOUR_DEPLOYED_BACKEND_URL>
 * 
 *    Option B (Direct Injection):
 *      window.ENV = { VITE_API_BASE_URL: "https://<YOUR_DEPLOYED_BACKEND_URL>" };
 * 
 *    Option C (Runtime Browser Testing):
 *      In your browser DevTools Console, run:
 *      localStorage.setItem('gg_api_base_url', 'https://<YOUR_DEPLOYED_BACKEND_URL>');
 * ============================================================================
 */

window.ENV = window.ENV || {};

// If window.ENV.VITE_API_BASE_URL is not yet set, we safely detect the environment:
if (!window.ENV.VITE_API_BASE_URL) {
  const isLocal = typeof window !== 'undefined' && 
                  (window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.protocol === 'file:');
  
  if (isLocal) {
    window.ENV.VITE_API_BASE_URL = 'http://localhost:8080';
  } else {
    // When deployed on Vercel, relative path or configured production backend
    window.ENV.VITE_API_BASE_URL = window.GG_BACKEND_URL || '';
  }
}
