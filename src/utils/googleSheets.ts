import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';

export const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SPREADSHEET_ID_STORAGE_KEY = 'shivamrit_google_sheet_id_v1';

// Strictly in-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let cachedSheetsAccessToken: string | null = null;
let cachedSheetsAccountEmail: string | null = null;

export function getCachedSheetsAccessToken(): string | null {
  return cachedSheetsAccessToken;
}

export function getCachedSheetsAccountEmail(): string | null {
  return cachedSheetsAccountEmail;
}

export function clearSheetsAccessToken(): void {
  cachedSheetsAccessToken = null;
  cachedSheetsAccountEmail = null;
}

export function getSavedSpreadsheetId(): string {
  const envDefault = (import.meta.env?.VITE_GOOGLE_SHEET_ID || '').trim();
  if (typeof window === 'undefined') return envDefault;
  try {
    return (localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY) || envDefault || '').trim();
  } catch {
    return envDefault;
  }
}

export function setSavedSpreadsheetId(spreadsheetId: string): void {
  if (typeof window === 'undefined') return;
  const clean = spreadsheetId.trim();
  try {
    if (!clean) {
      localStorage.removeItem(SPREADSHEET_ID_STORAGE_KEY);
    } else {
      localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, clean);
    }
  } catch {
    // ignore storage errors
  }
}

export function extractSpreadsheetIdFromInput(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export async function connectGoogleSheets(): Promise<{
  success: boolean;
  accessToken?: string;
  email?: string;
  error?: string;
}> {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope(GOOGLE_SHEETS_SCOPE);
    provider.setCustomParameters({
      prompt: 'consent',
      access_type: 'online',
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || '';
    if (!accessToken) {
      return {
        success: false,
        error: 'Google sign-in completed, but Google Sheets permission was not granted.',
      };
    }
    cachedSheetsAccessToken = accessToken;
    cachedSheetsAccountEmail = result.user?.email || null;
    return {
      success: true,
      accessToken,
      email: result.user?.email || undefined,
    };
  } catch (err: any) {
    const msg =
      err?.code === 'auth/popup-closed-by-user'
        ? 'Google sign-in window was closed before granting Sheets access.'
        : err?.message || 'Unable to connect Google Sheets right now.';
    return { success: false, error: msg };
  }
}

async function parseGoogleError(res: Response, fallback: string): Promise<string> {
  try {
    const payload = await res.json();
    const apiMsg = payload?.error?.message;
    if (res.status === 401 || res.status === 403) {
      clearSheetsAccessToken();
      return apiMsg
        ? `Google Sheets session expired or lacks access (${apiMsg}). Please reconnect.`
        : 'Google Sheets permission expired or missing. Please reconnect with Google.';
    }
    return apiMsg || fallback;
  } catch {
    return fallback;
  }
}

export const LEAD_SHEET_HEADERS = [
  'Inquiry ID',
  'Submitted At',
  'Full Name',
  'WhatsApp Mobile',
  'Email',
  'Interested In',
  'Message / Notes',
  'Hero Slide',
  'Status',
];

export async function createLeadsSpreadsheet(
  accessToken: string,
  title: string = 'ShivAmrit Healers — Inquiry Leads'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Leads' } }],
    }),
  });

  if (!createRes.ok) {
    throw new Error(await parseGoogleError(createRes, 'Failed to create Google Spreadsheet.'));
  }

  const created = await createRes.json();
  const spreadsheetId = String(created.spreadsheetId || '');
  const spreadsheetUrl = String(
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  );

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent('Leads!A1')}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [LEAD_SHEET_HEADERS],
      }),
    }
  );

  setSavedSpreadsheetId(spreadsheetId);
  return { spreadsheetId, spreadsheetUrl };
}

export async function appendLeadRowsToSheet(
  accessToken: string,
  spreadsheetId: string,
  rows: string[][]
): Promise<{ updatedRows: number; spreadsheetUrl: string }> {
  const cleanId = extractSpreadsheetIdFromInput(spreadsheetId);
  if (!cleanId) {
    throw new Error('Please enter or create a valid Google Spreadsheet ID first.');
  }

  const range = 'A1';
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(await parseGoogleError(res, 'Failed to append inquiry rows to Google Sheet.'));
  }

  const data = await res.json();
  return {
    updatedRows: Number(data?.updates?.updatedRows || rows.length),
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
  };
}
