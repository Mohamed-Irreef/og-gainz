const { OAuth2Client } = require('google-auth-library');

const { ENV } = require('./env.config');

// Phase 2B uses Google ID-token flow by default.
// Access-token verification is supported for custom UI flows.
// GOOGLE_CLIENT_SECRET and GOOGLE_OAUTH_REDIRECT_URI are not used here.
let oauthClient = null;

const getOAuthClient = () => {
  if (oauthClient) return oauthClient;
  if (!ENV.GOOGLE_CLIENT_ID || String(ENV.GOOGLE_CLIENT_ID).trim().length === 0) {
    const err = new Error('Google OAuth is not configured (missing GOOGLE_CLIENT_ID)');
    err.statusCode = 500;
    throw err;
  }
  oauthClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);
  return oauthClient;
};

const verifyGoogleToken = async (idToken) => {
  if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
    const err = new Error('idToken is required');
    err.statusCode = 400;
    throw err;
  }

  try {
    const client = getOAuthClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: ENV.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      const err = new Error('Invalid Google token payload');
      err.statusCode = 401;
      throw err;
    }

    return payload;
  } catch (error) {
    const err = new Error('Invalid or expired Google token');
    err.statusCode = 401;
    // Preserve original error for debugging only (non-enumerable)
    Object.defineProperty(err, 'cause', { value: error });
    throw err;
  }
};

const verifyGoogleAccessToken = async (accessToken) => {
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    const err = new Error('accessToken is required');
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const err = new Error('Invalid or expired Google access token');
      err.statusCode = 401;
      throw err;
    }

    const payload = await response.json();
    if (!payload || !payload.email) {
      const err = new Error('Invalid Google token payload');
      err.statusCode = 401;
      throw err;
    }

    return payload;
  } catch (error) {
    const err = new Error('Invalid or expired Google access token');
    err.statusCode = 401;
    Object.defineProperty(err, 'cause', { value: error });
    throw err;
  }
};

module.exports = {
  oauthClient,
  verifyGoogleToken,
  verifyGoogleAccessToken,
};
