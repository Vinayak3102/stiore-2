import type { UserProfile, CourierAddress, RegisteredAccount } from '../types/auth';

const STORAGE_KEYS = {
  CURRENT_USER: 'shivamrit_current_user',
  REGISTERED_ACCOUNTS: 'shivamrit_registered_accounts_v1',
};

// Dispatch a custom window event for reactive updates across components
export const notifyAuthStateChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('shivamrit-auth-change'));
  }
};

export const getRegisteredAccounts = (): RegisteredAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_ACCOUNTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveRegisteredAccounts = (accounts: RegisteredAccount[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.REGISTERED_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts to storage:', err);
  }
};

export const getCurrentUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: UserProfile | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    notifyAuthStateChanged();
  } catch (err) {
    console.error('Failed to set current user:', err);
  }
};

export const registerUser = (
  name: string,
  mobile: string,
  email: string,
  password: string,
  courierAddress?: CourierAddress
): { success: boolean; user?: UserProfile; error?: string } => {
  const cleanName = name.trim();
  const cleanMobile = mobile.trim().replace(/\s+/g, '');
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName) return { success: false, error: 'Full Name is required' };
  if (!cleanMobile || cleanMobile.length < 10) return { success: false, error: 'Valid 10-digit mobile number is required' };
  if (!cleanEmail || !cleanEmail.includes('@')) return { success: false, error: 'Valid email address is required' };
  if (!password || password.length < 4) return { success: false, error: 'Password must be at least 4 characters' };

  const accounts = getRegisteredAccounts();

  // Check if mobile or email already exists
  const exists = accounts.find(
    (acc) => acc.profile.email === cleanEmail || acc.profile.mobile === cleanMobile
  );

  if (exists) {
    return {
      success: false,
      error: 'An account with this email or mobile number already exists. Please log in.',
    };
  }

  const newProfile: UserProfile = {
    id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: cleanName,
    mobile: cleanMobile,
    email: cleanEmail,
    courierAddress,
    createdAt: new Date().toISOString(),
  };

  const newAccount: RegisteredAccount = {
    profile: newProfile,
    password,
  };

  accounts.push(newAccount);
  saveRegisteredAccounts(accounts);
  setCurrentUser(newProfile);

  return { success: true, user: newProfile };
};

export const loginUser = (
  identifier: string,
  password: string
): { success: boolean; user?: UserProfile; error?: string } => {
  const cleanId = identifier.trim().toLowerCase().replace(/\s+/g, '');
  if (!cleanId) return { success: false, error: 'Enter your Email or Mobile Number' };
  if (!password) return { success: false, error: 'Enter your Password' };

  const accounts = getRegisteredAccounts();

  const found = accounts.find(
    (acc) =>
      acc.profile.email.toLowerCase() === cleanId ||
      acc.profile.mobile.replace(/\s+/g, '') === cleanId
  );

  if (!found) {
    return { success: false, error: 'No account found with this email or mobile number' };
  }

  if (found.password !== password) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  setCurrentUser(found.profile);
  return { success: true, user: found.profile };
};

export const updateCourierAddress = (
  userId: string,
  address: CourierAddress
): UserProfile | null => {
  const accounts = getRegisteredAccounts();
  const accIndex = accounts.findIndex((acc) => acc.profile.id === userId);

  let updatedProfile: UserProfile | null = null;

  if (accIndex !== -1) {
    accounts[accIndex].profile.courierAddress = address;
    saveRegisteredAccounts(accounts);
    updatedProfile = accounts[accIndex].profile;
  }

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    currentUser.courierAddress = address;
    setCurrentUser(currentUser);
    updatedProfile = currentUser;
  }

  return updatedProfile;
};

export const logoutUser = (): void => {
  setCurrentUser(null);
};
