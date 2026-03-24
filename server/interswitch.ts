/**
 * INTERSWITCH PAYMENT INTEGRATION
 * Handles escrow payments (collections) and creator payouts (disbursements)
 * via the Interswitch IPG v2 REST API.
 *
 * Docs: https://developer.interswitchgroup.com/
 *
 * Required env vars:
 *   INTERSWITCH_CLIENT_ID
 *   INTERSWITCH_CLIENT_SECRET
 *   INTERSWITCH_MERCHANT_CODE
 *   INTERSWITCH_PAY_ITEM_ID
 *   INTERSWITCH_ENV   (sandbox | production)  default: sandbox
 */

import crypto from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────

const ENV_MODE = process.env.INTERSWITCH_ENV ?? "sandbox";
const BASE_URL =
  ENV_MODE === "production"
    ? "https://api.interswitchng.com"
    : "https://sandbox.interswitchng.com";

const CLIENT_ID     = process.env.INTERSWITCH_CLIENT_ID     ?? "";
const CLIENT_SECRET = process.env.INTERSWITCH_CLIENT_SECRET ?? "";
const MERCHANT_CODE = process.env.INTERSWITCH_MERCHANT_CODE ?? "";
const PAY_ITEM_ID   = process.env.INTERSWITCH_PAY_ITEM_ID   ?? "";
const CURRENCY_NGN  = "566";

export const interswitchConfig = {
  merchantCode: MERCHANT_CODE,
  payItemId: PAY_ITEM_ID,
  platformFeePercentage: 0.05, // 5%
  proSubscriptionPrice: 1200, // ₦1,200/month
};

export const isConfigured = () => !!(CLIENT_ID && CLIENT_SECRET && MERCHANT_CODE && PAY_ITEM_ID);

// ── HMAC Signature ────────────────────────────────────────────────────────────

function sha512(value: string): string {
  return crypto.createHash("sha512").update(value).digest("hex");
}

function hmacSha512(secret: string, value: string): string {
  return crypto.createHmac("sha512", secret).update(value).digest("base64");
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Build Interswitch request headers (Authorization + Signature).
 * Signature = HMAC-SHA512(CLIENT_SECRET, clientId + timestamp + nonce + METHOD + resourcePath + bodyHash)
 */
function buildHeaders(method: string, resourcePath: string, body: string): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const bodyHash = body ? sha512(body) : "";
  const sigBase = `${CLIENT_ID}${timestamp}${nonce}${method}${resourcePath}${bodyHash}`;
  const signature = hmacSha512(CLIENT_SECRET, sigBase);

  return {
    "Content-Type": "application/json",
    Authorization: `InterswitchAuth ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    Timestamp: timestamp,
    Nonce: nonce,
    Signature: signature,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentInitResult {
  transactionRef: string;
  redirectUrl: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  amount?: number;
  message?: string;
}

export interface BankAccountLookupResult {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

export interface DisbursementResult {
  success: boolean;
  reference?: string;
  message?: string;
}

// ── Collections (Campaign Funding) ────────────────────────────────────────────

/**
 * Initialise an Interswitch Webpay transaction.
 * Returns the payment redirect URL + transaction reference to store in the DB.
 */
export async function initializePayment(
  campaignId: number,
  amountNGN: number,
  customerEmail: string,
  customerName: string,
  callbackUrl: string
): Promise<PaymentInitResult> {
  const transactionRef = `VY-${campaignId}-${Date.now()}`;
  const amountKobo = Math.round(amountNGN * 100);

  if (!isConfigured()) {
    // Dev / demo mode — return a simulated redirect URL
    console.warn("[Interswitch] Not configured — returning mock payment URL");
    return {
      transactionRef,
      redirectUrl: `${callbackUrl}?txnref=${transactionRef}&responseCode=00`,
    };
  }

  const resourcePath = "/api/v2/purchases";
  const body = JSON.stringify({
    merchantCode: MERCHANT_CODE,
    payableCode: PAY_ITEM_ID,
    transactionReference: transactionRef,
    amount: amountKobo,
    currency: CURRENCY_NGN,
    redirectUrl: callbackUrl,
    customerId: customerEmail,
    customerEmail,
    customerName,
    description: `Vyral campaign #${campaignId} funding`,
  });

  const headers = buildHeaders("POST", resourcePath, body);

  const res = await fetch(`${BASE_URL}${resourcePath}`, {
    method: "POST",
    headers,
    body,
  });

  const data = await res.json() as any;
  if (!res.ok) {
    throw new Error(data?.description ?? data?.message ?? "Payment initialization failed");
  }

  // The API returns a `redirectUrl` for the hosted payment page
  const redirectUrl = data.redirectUrl ?? `${BASE_URL}/collections/v1/pay?txnref=${transactionRef}`;
  return { transactionRef, redirectUrl };
}

/**
 * Verify an Interswitch payment after the user returns from the payment page.
 */
export async function verifyPayment(
  transactionRef: string,
  amountNGN: number
): Promise<PaymentVerifyResult> {
  if (!isConfigured()) {
    console.warn("[Interswitch] Not configured — auto-approving payment");
    return { success: true, amount: amountNGN };
  }

  const amountKobo = Math.round(amountNGN * 100);
  const resourcePath = `/api/v2/purchases?merchantcode=${MERCHANT_CODE}&transactionreference=${transactionRef}&amount=${amountKobo}`;

  const headers = buildHeaders("GET", resourcePath, "");

  const res = await fetch(`${BASE_URL}${resourcePath}`, { method: "GET", headers });
  const data = await res.json() as any;

  if (!res.ok) {
    return { success: false, message: data?.description ?? "Verification failed" };
  }

  // responseCode "00" means success
  const success = data.responseCode === "00";
  return {
    success,
    amount: success ? amountNGN : undefined,
    message: data.responseDescription ?? data.description,
  };
}

// ── Disbursements (Creator Payouts) ───────────────────────────────────────────

/**
 * Resolve a NUBAN account to its registered name.
 */
export async function lookupBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<BankAccountLookupResult> {
  if (!isConfigured()) {
    return { accountName: "Account Holder", accountNumber, bankCode };
  }

  const resourcePath = `/api/v2/enquiries/nuban?accountIdentifier=${accountNumber}&institutionCode=${bankCode}`;
  const headers = buildHeaders("GET", resourcePath, "");
  const res = await fetch(`${BASE_URL}${resourcePath}`, { method: "GET", headers });
  const data = await res.json() as any;

  if (!res.ok || !data.accountName) {
    throw new Error(data?.description ?? "Account lookup failed");
  }

  return { accountName: data.accountName, accountNumber, bankCode };
}

/**
 * Disburse funds to a creator's bank account (NIP transfer).
 */
export async function disburseToBankAccount(
  accountNumber: string,
  bankCode: string,
  accountName: string,
  amountNGN: number,
  narration: string,
  payoutId: number
): Promise<DisbursementResult> {
  const requestRef = `VY-PAY-${payoutId}-${Date.now()}`;

  if (!isConfigured()) {
    console.warn("[Interswitch] Not configured — mock disbursement");
    return { success: true, reference: requestRef };
  }

  const amountKobo = Math.round(amountNGN * 100);
  const resourcePath = "/api/v2/transfers";

  // MAC for transfer: SHA512(merchantCode + initiatingEntityCode + beneficiaryAccountNumber + amount + destinationBankCode + narration + requestRef)
  const macData = `${MERCHANT_CODE}${MERCHANT_CODE}${accountNumber}${amountKobo}${bankCode}${narration}${requestRef}`;
  const mac = sha512(macData);

  const body = JSON.stringify({
    clientId: CLIENT_ID,
    merchantCode: MERCHANT_CODE,
    mac,
    initiatingEntityCode: MERCHANT_CODE,
    beneficiaryAccountNumber: accountNumber,
    beneficiaryName: accountName,
    destinationBankCode: bankCode,
    narration,
    amount: amountKobo,
    requestRef,
    currencyCode: CURRENCY_NGN,
  });

  const headers = buildHeaders("POST", resourcePath, body);
  const res = await fetch(`${BASE_URL}${resourcePath}`, { method: "POST", headers, body });
  const data = await res.json() as any;

  if (!res.ok) {
    return { success: false, message: data?.description ?? data?.message ?? "Transfer failed" };
  }

  // responseCode "00" = success
  const success = data.responseCode === "00";
  return { success, reference: requestRef, message: data.responseDescription };
}

// ── Nigerian Bank Codes ────────────────────────────────────────────────────────

export const NIGERIAN_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "063", name: "Access Bank (Diamond)" },
  { code: "035A", name: "ALAT by Wema" },
  { code: "401", name: "ASO Savings and Loans" },
  { code: "023", name: "Citibank Nigeria" },
  { code: "050", name: "EcoBank Nigeria" },
  { code: "562", name: "Ekondo MFB" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Kuda MFB" },
  { code: "090175", name: "Moniepoint MFB" },
  { code: "014", name: "MainStreet Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "ProvidusBank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "999992", name: "OPay" },
  { code: "999991", name: "PalmPay" },
] as const;
