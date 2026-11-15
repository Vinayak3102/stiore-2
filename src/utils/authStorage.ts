import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  OperationType,
  handleFirestoreError,
} from '../lib/firebase';
import type { UserProfile, CourierAddress } from '../types/auth';
import { clearSheetsAccessToken } from './googleSheets';

const LEGACY_STORAGE_KEYS = [
  'shivamrit_current_user',
  'shivamrit_registered_accounts_v1',
];

const BOOTSTRAPPED_ADMIN_EMAIL = 'vinayakacdemy@gmail.com';

// Non-sensitive UI cache (zero passwords, zero sensitive tokens)
const PROFILE_CACHE_KEY = 'shivamrit_profile_ui_cache_v2';

export function purgeLegacyPlaintextAuthStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage access issues
  }
}

export const notifyAuthStateChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('shivamrit-auth-change'));
  }
};

function readProfileCache(uid: string): Partial<UserProfile> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid === uid) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeProfileCache(profile: UserProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!profile) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    } else {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    }
  } catch {
    // ignore
  }
}

export function buildBaseProfile(firebaseUser: User): UserProfile {
  const email = (firebaseUser.email || '').toLowerCase();
  const isAdmin =
    Boolean(firebaseUser.emailVerified) && email === BOOTSTRAPPED_ADMIN_EMAIL;
  const cached = readProfileCache(firebaseUser.uid);

  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    name:
      cached?.name ||
      firebaseUser.displayName ||
      email.split('@')[0] ||
      'ShivAmrit Member',
    mobile: cached?.mobile || firebaseUser.phoneNumber || '',
    email: firebaseUser.email || '',
    emailVerified: Boolean(firebaseUser.emailVerified),
    isAdmin,
    courierAddress: cached?.courierAddress,
    createdAt:
      firebaseUser.metadata.creationTime ||
      cached?.createdAt ||
      new Date().toISOString(),
    updatedAt: cached?.updatedAt,
  };
}

export async function getAuthIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export async function fetchUserProfileFromFirestore(
  firebaseUser: User
): Promise<UserProfile> {
  const base = buildBaseProfile(firebaseUser);
  if (!firebaseUser.emailVerified) {
    writeProfileCache(base);
    return base;
  }

  const publicPath = `users/${firebaseUser.uid}`;
  const privatePath = `users/${firebaseUser.uid}/private/info`;

  try {
    const publicRef = doc(db, 'users', firebaseUser.uid);
    const publicSnap = await getDoc(publicRef);
    if (!publicSnap.exists()) {
      await setDoc(publicRef, {
        uid: firebaseUser.uid,
        displayName: base.name.slice(0, 120) || 'ShivAmrit Member',
        createdAt: base.createdAt,
      });
    }
  } catch (err) {
    console.warn('Public profile sync skipped or failed:', err);
  }

  try {
    const privateRef = doc(db, 'users', firebaseUser.uid, 'private', 'info');
    const privateSnap = await getDoc(privateRef);
    if (privateSnap.exists()) {
      const data = privateSnap.data();
      const merged: UserProfile = {
        ...base,
        name: String(data.name || base.name),
        mobile: String(data.mobile || base.mobile),
        email: String(data.email || base.email),
        updatedAt: String(data.updatedAt || ''),
        courierAddress:
          data.streetAddress && data.city && data.pincode
            ? {
                streetAddress: String(data.streetAddress),
                landmark: data.landmark ? String(data.landmark) : '',
                city: String(data.city),
                state: String(data.state || 'India'),
                pincode: String(data.pincode),
              }
            : base.courierAddress,
      };
      writeProfileCache(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Private profile fetch note:', err);
  }

  writeProfileCache(base);
  return base;
}

export function getCurrentUser(): UserProfile | null {
  purgeLegacyPlaintextAuthStorage();
  const user = auth.currentUser;
  if (!user) return null;
  return buildBaseProfile(user);
}

export function subscribeToAuth(
  onUserChange: (profile: UserProfile | null) => void
): () => void {
  purgeLegacyPlaintextAuthStorage();
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      writeProfileCache(null);
      onUserChange(null);
      notifyAuthStateChanged();
      return;
    }
    const profile = await fetchUserProfileFromFirestore(firebaseUser);
    onUserChange(profile);
    notifyAuthStateChanged();
  });
}

export async function signInWithGoogle(): Promise<{
  success: boolean;
  user?: UserProfile;
  error?: string;
}> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const profile = await fetchUserProfileFromFirestore(result.user);
    notifyAuthStateChanged();
    return { success: true, user: profile };
  } catch (err: any) {
    const message =
      err?.code === 'auth/popup-closed-by-user'
        ? 'Google sign-in popup was closed before finishing.'
        : err?.message || 'Unable to sign in with Google right now.';
    return { success: false, error: message };
  }
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, error: 'Please enter both email ID and password.' };
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const profile = await fetchUserProfileFromFirestore(cred.user);
    notifyAuthStateChanged();
    return { success: true, user: profile };
  } catch (err: any) {
    const code = err?.code || '';
    const msg =
      code === 'auth/invalid-credential' || code === 'auth/wrong-password'
        ? 'Incorrect email or password.'
        : code === 'auth/user-not-found'
        ? 'No account exists for this email address.'
        : code === 'auth/too-many-requests'
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : err?.message || 'Unable to sign in.';
    return { success: false, error: msg };
  }
}

export async function registerWithEmailPassword(params: {
  name: string;
  mobile: string;
  email: string;
  password: string;
  courierAddress?: CourierAddress;
}): Promise<{
  success: boolean;
  user?: UserProfile;
  verificationSent?: boolean;
  error?: string;
}> {
  const cleanName = params.name.trim();
  const cleanMobile = params.mobile.trim().replace(/\s+/g, '');
  const cleanEmail = params.email.trim().toLowerCase();

  if (!cleanName) return { success: false, error: 'Full Name is required.' };
  if (cleanMobile.replace(/\D/g, '').length < 10) {
    return { success: false, error: 'Valid 10-digit mobile number is required.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Valid email address is required.' };
  }
  if (!params.password || params.password.length < 6) {
    return {
      success: false,
      error: 'Password must be at least 6 characters for Firebase security.',
    };
  }

  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      params.password
    );
    await updateProfile(cred.user, { displayName: cleanName });
    let verificationSent = false;
    try {
      await sendEmailVerification(cred.user);
      verificationSent = true;
    } catch {
      // ignore verification email throttle errors
    }

    const profile: UserProfile = {
      id: cred.user.uid,
      uid: cred.user.uid,
      name: cleanName,
      mobile: cleanMobile,
      email: cleanEmail,
      emailVerified: Boolean(cred.user.emailVerified),
      isAdmin: false,
      courierAddress: params.courierAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeProfileCache(profile);
    notifyAuthStateChanged();
    return { success: true, user: profile, verificationSent };
  } catch (err: any) {
    const code = err?.code || '';
    const msg =
      code === 'auth/email-already-in-use'
        ? 'An account with this email already exists. Please sign in.'
        : code === 'auth/weak-password'
        ? 'Please choose a stronger password (at least 6 characters).'
        : err?.message || 'Registration failed.';
    return { success: false, error: msg };
  }
}

export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Enter your registered email address first.' };
  }
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      success: true,
      message: `Password reset link sent to ${cleanEmail}. Check your inbox or spam folder.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Unable to send password reset email.',
    };
  }
}

export async function resendVerificationEmail(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!auth.currentUser) {
    return { success: false, message: 'Sign in first to verify your email.' };
  }
  try {
    await sendEmailVerification(auth.currentUser);
    return {
      success: true,
      message: `Verification email sent to ${auth.currentUser.email}. Refresh after clicking the link.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Unable to send verification email right now.',
    };
  }
}

export async function saveUserProfileAndAddress(params: {
  name: string;
  mobile: string;
  courierAddress?: CourierAddress;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return { success: false, error: 'Please sign in first.' };
  }

  const cleanName = params.name.trim();
  const cleanMobile = params.mobile.trim().replace(/\s+/g, '');
  if (!cleanName) {
    return { success: false, error: 'Full Name is required.' };
  }
  if (cleanMobile.replace(/\D/g, '').length < 10) {
    return { success: false, error: 'Valid 10-digit mobile number is required.' };
  }

  const base = buildBaseProfile(firebaseUser);
  const now = new Date().toISOString();
  const updated: UserProfile = {
    ...base,
    name: cleanName,
    mobile: cleanMobile,
    courierAddress: params.courierAddress ?? base.courierAddress,
    updatedAt: now,
  };

  writeProfileCache(updated);
  notifyAuthStateChanged();

  if (!firebaseUser.emailVerified) {
    return {
      success: true,
      user: updated,
    };
  }

  const publicPath = `users/${firebaseUser.uid}`;
  const privatePath = `users/${firebaseUser.uid}/private/info`;

  try {
    await setDoc(
      doc(db, 'users', firebaseUser.uid),
      {
        uid: firebaseUser.uid,
        displayName: cleanName.slice(0, 120),
        createdAt: base.createdAt,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  const payload: Record<string, string> = {
    uid: firebaseUser.uid,
    name: cleanName.slice(0, 120),
    mobile: cleanMobile.slice(0, 20),
    email: (firebaseUser.email || updated.email).slice(0, 160),
    updatedAt: now,
  };
  if (updated.courierAddress) {
    payload.streetAddress = updated.courierAddress.streetAddress.slice(0, 300);
    payload.landmark = (updated.courierAddress.landmark || '').slice(0, 150);
    payload.city = updated.courierAddress.city.slice(0, 100);
    payload.state = (updated.courierAddress.state || 'India').slice(0, 100);
    payload.pincode = updated.courierAddress.pincode.slice(0, 10);
  }

  try {
    await setDoc(doc(db, 'users', firebaseUser.uid, 'private', 'info'), payload, {
      merge: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }

  return { success: true, user: updated };
}

export async function syncCartItemToFirestore(
  productId: string,
  qty: number
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const path = `users/${user.uid}/cart/${productId}`;
  try {
    const ref = doc(db, 'users', user.uid, 'cart', productId);
    if (qty <= 0) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        userId: user.uid,
        productId,
        qty: Math.min(50, Math.max(1, Math.floor(qty))),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn(`Cart sync skipped (${path}):`, error);
  }
}

export async function syncWishlistItemToFirestore(
  productId: string,
  saved: boolean
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  try {
    const ref = doc(db, 'users', user.uid, 'wishlist', productId);
    if (saved) {
      await setDoc(ref, {
        userId: user.uid,
        productId,
        addedAt: new Date().toISOString(),
      });
    } else {
      await deleteDoc(ref);
    }
  } catch (error) {
    console.warn('Wishlist sync skipped:', error);
  }
}

export async function loadCloudCartAndWishlist(uid: string): Promise<{
  cart: { productId: string; qty: number }[];
  wishlist: string[];
}> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || user.uid !== uid) {
    return { cart: [], wishlist: [] };
  }
  try {
    const [cartSnap, wishSnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'cart')),
      getDocs(collection(db, 'users', uid, 'wishlist')),
    ]);
    return {
      cart: cartSnap.docs.map((d) => ({
        productId: String(d.data().productId || d.id),
        qty: Number(d.data().qty || 1),
      })),
      wishlist: wishSnap.docs.map((d) => String(d.data().productId || d.id)),
    };
  } catch {
    return { cart: [], wishlist: [] };
  }
}

export async function logoutUser(): Promise<void> {
  clearSheetsAccessToken();
  writeProfileCache(null);
  purgeLegacyPlaintextAuthStorage();
  await signOut(auth);
  notifyAuthStateChanged();
}
