const PAYPAL_API = process.env.PAYPAL_API_URL;
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

/**
 * Generate an OAuth 2.0 access token for the PayPal API
 */
export async function generateAccessToken() {
  if (!PAYPAL_API || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("MISSING_PAYPAL_CREDENTIALS");
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const data = await response.json();
  return data.access_token;
}