import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Truck,
  Sparkles,
  Edit3,
  Package,
  Calendar,
  Loader2,
  ShieldCheck,
  FileDown,
} from 'lucide-react';
import { downloadOrderInvoice } from '../utils/invoiceGenerator';
import type { UserProfile, CourierAddress } from '../types/auth';
import {
  getCurrentUser,
  getAuthIdToken,
  signInWithGoogle,
  loginWithEmailPassword,
  registerWithEmailPassword,
  requestPasswordReset,
  resendVerificationEmail,
  saveUserProfileAndAddress,
  logoutUser,
} from '../utils/authStorage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
  initialMode?: 'login' | 'register' | 'profile';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<'login' | 'register' | 'profile'>('login');
  const [profileTab, setProfileTab] = useState<'profile' | 'orders' | 'sessions'>('profile');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [includeCourierAddress, setIncludeCourierAddress] = useState(true);

  // Profile & Address fields
  const [profileName, setProfileName] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');

  // Activity state
  const [activityLoading, setActivityLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [workshopRegs, setWorkshopRegs] = useState<any[]>([]);

  // UI state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const hydrateFields = (user: UserProfile | null) => {
    if (!user) return;
    setProfileName(user.name || '');
    setProfileMobile(user.mobile || '');
    if (user.courierAddress) {
      setStreetAddress(user.courierAddress.streetAddress || '');
      setLandmark(user.courierAddress.landmark || '');
      setCity(user.courierAddress.city || '');
      setStateName(user.courierAddress.state || 'Maharashtra');
      setPincode(user.courierAddress.pincode || '');
    }
  };

  const loadAccountActivity = async () => {
    const token = await getAuthIdToken();
    if (!token) return;
    setActivityLoading(true);
    try {
      const res = await fetch('/api/my-account-activity', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setBookings(data.bookings || []);
        setWorkshopRegs(data.workshopRegistrations || []);
      }
    } catch {
      // ignore network fetch failure for secondary tab
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const user = getCurrentUser();
      setCurrentUserState(user);
      if (user) {
        setMode('profile');
        hydrateFields(user);
        loadAccountActivity();
      } else {
        setMode(initialMode === 'profile' ? 'login' : initialMode);
      }
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setBusy(true);
    const res = await signInWithGoogle();
    setBusy(false);
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Google sign-in failed.');
      return;
    }
    setCurrentUserState(res.user);
    hydrateFields(res.user);
    setMode('profile');
    setSuccessMsg(`Welcome, ${res.user.name}!`);
    onSuccess?.(res.user);
    loadAccountActivity();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setBusy(true);
    const res = await loginWithEmailPassword(loginEmail, loginPassword);
    setBusy(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Failed to sign in.');
      return;
    }

    setCurrentUserState(res.user);
    hydrateFields(res.user);
    setMode('profile');
    setSuccessMsg(`Welcome back, ${res.user.name}!`);
    onSuccess?.(res.user);
    loadAccountActivity();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let addressData: CourierAddress | undefined = undefined;
    if (includeCourierAddress && (streetAddress.trim() || city.trim() || pincode.trim())) {
      if (!streetAddress.trim() || !city.trim() || !/^[0-9]{6}$/.test(pincode.trim())) {
        setErrorMsg('Please enter street address, city, and a valid 6-digit PIN code.');
        return;
      }
      addressData = {
        streetAddress: streetAddress.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: stateName.trim() || 'India',
        pincode: pincode.trim(),
      };
    }

    setBusy(true);
    const res = await registerWithEmailPassword({
      name: regName,
      mobile: regMobile,
      email: regEmail,
      password: regPassword,
      courierAddress: addressData,
    });
    setBusy(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Registration failed.');
      return;
    }

    setCurrentUserState(res.user);
    hydrateFields(res.user);
    setMode('profile');
    setSuccessMsg(
      res.verificationSent
        ? 'Account created! Verification link sent to your email for cloud sync.'
        : 'Account created successfully!'
    );
    onSuccess?.(res.user);
  };

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setBusy(true);
    const res = await requestPasswordReset(loginEmail);
    setBusy(false);
    if (res.success) setSuccessMsg(res.message);
    else setErrorMsg(res.message);
  };

  const handleResendVerification = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setBusy(true);
    const res = await resendVerificationEmail();
    setBusy(false);
    if (res.success) setSuccessMsg(res.message);
    else setErrorMsg(res.message);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (!profileName.trim() || profileMobile.replace(/\D/g, '').length < 10) {
      setErrorMsg('Valid full name and 10-digit mobile number are required.');
      return;
    }
    if (!streetAddress.trim() || !city.trim() || !/^[0-9]{6}$/.test(pincode.trim())) {
      setErrorMsg('Street address, city, and 6-digit PIN code are required.');
      return;
    }

    setBusy(true);
    try {
      const res = await saveUserProfileAndAddress({
        name: profileName,
        mobile: profileMobile,
        courierAddress: {
          streetAddress: streetAddress.trim(),
          landmark: landmark.trim(),
          city: city.trim(),
          state: stateName.trim() || 'India',
          pincode: pincode.trim(),
        },
      });
      if (!res.success || !res.user) {
        setErrorMsg(res.error || 'Could not save profile.');
      } else {
        setCurrentUserState(res.user);
        setIsEditingAddress(false);
        setSuccessMsg(
          res.user.emailVerified
            ? 'Profile & courier address synced to your verified account!'
            : 'Saved for this session. Verify your email to enable permanent cloud sync.'
        );
        onSuccess?.(res.user);
      }
    } catch {
      setErrorMsg('Failed to update cloud profile. Check email verification status.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    await logoutUser();
    setBusy(false);
    setCurrentUserState(null);
    setMode('login');
    setOrders([]);
    setBookings([]);
    setWorkshopRegs([]);
    setSuccessMsg('Signed out successfully.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#18283e] text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="size-4.5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#f3d37a]">
              <Sparkles className="size-5.5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="font-serif text-xl font-bold text-white tracking-wide">
                {currentUser
                  ? `Namaste, ${currentUser.name.split(' ')[0]}`
                  : mode === 'login'
                  ? 'Sign In to Your Account'
                  : 'Create Your Sacred Account'}
              </h2>
              <p className="text-xs text-white/70 mt-0.5">
                {currentUser
                  ? 'Manage saved courier address, orders & sessions'
                  : 'Firebase-secured account with saved 1-click courier address'}
              </p>
            </div>
          </div>

          {!currentUser ? (
            <div className="flex bg-white/10 rounded-xl p-1 mt-5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  mode === 'login'
                    ? 'bg-white text-[#18283e] shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  mode === 'register'
                    ? 'bg-white text-[#18283e] shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Register & Save Address
              </button>
            </div>
          ) : (
            <div className="flex bg-white/10 rounded-xl p-1 mt-5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setProfileTab('profile')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  profileTab === 'profile'
                    ? 'bg-white text-[#18283e]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Profile & Address
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('orders')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  profileTab === 'orders'
                    ? 'bg-white text-[#18283e]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                My Orders ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('sessions')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  profileTab === 'sessions'
                    ? 'bg-white text-[#18283e]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Sessions ({bookings.length + workshopRegs.length})
              </button>
            </div>
          )}
        </div>

        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {!currentUser && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleLogin}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                <ShieldCheck className="size-4 text-[#18283e]" />
                <span>Continue with Google (Instant Verified Sign-In)</span>
              </button>
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400">
                  or with email & password
                </span>
                <div className="grow border-t border-slate-200" />
              </div>
            </>
          )}

          {!currentUser && mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="auth-login-email" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    id="auth-login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-login-password" className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] text-[#e07038] hover:underline font-semibold"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    id="auth-login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-[#18283e] hover:bg-[#121e30] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <span>Sign In & Load Profile →</span>}
              </button>
            </form>
          )}

          {!currentUser && mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="auth-reg-name" className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                  <input
                    id="auth-reg-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Parul Suthar"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="auth-reg-mobile" className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                    <input
                      id="auth-reg-mobile"
                      type="tel"
                      required
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-reg-email" className="block text-xs font-bold text-slate-700 mb-1">
                    Email ID
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                    <input
                      id="auth-reg-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="auth-reg-password" className="block text-xs font-bold text-slate-700 mb-1">
                  Create Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                  <input
                    id="auth-reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeCourierAddress}
                    onChange={(e) => setIncludeCourierAddress(e.target.checked)}
                    className="rounded text-[#18283e]"
                  />
                  <Truck className="size-4 text-[#e07038]" />
                  <span>Save Courier Delivery Address Now</span>
                </label>
              </div>

              {includeCourierAddress && (
                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Street Address / Flat / Society
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="Flat 402, Shivam Heights, MG Road"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Landmark (Optional)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="State"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-[#18283e] hover:bg-[#121e30] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <span>Create Firebase Account →</span>}
              </button>
            </form>
          )}

          {currentUser && profileTab === 'profile' && (
            <div className="space-y-4">
              {!currentUser.emailVerified && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                  <span>Verify your email link to enable encrypted Firestore profile sync.</span>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="px-2.5 py-1 bg-amber-900 text-white rounded-lg font-bold shrink-0"
                  >
                    Resend
                  </button>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37] bg-slate-900/5 px-2 py-0.5 rounded">
                    {currentUser.isAdmin
                      ? 'Verified Store Admin'
                      : currentUser.emailVerified
                      ? 'Verified Member'
                      : 'Pending Email Verification'}
                  </span>
                  <span className="text-[11px] text-slate-400">UID: {currentUser.uid.slice(-6)}</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-slate-900">{currentUser.name}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{currentUser.mobile || 'Add mobile below'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{currentUser.email}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Truck className="size-4 text-[#e07038]" />
                    <span>Saved Profile & Courier Address</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                    className="text-xs text-[#18283e] hover:underline font-bold flex items-center gap-1"
                  >
                    <Edit3 className="size-3" />
                    <span>{isEditingAddress ? 'Cancel' : currentUser.courierAddress ? 'Edit' : 'Add'}</span>
                  </button>
                </div>

                {!isEditingAddress ? (
                  currentUser.courierAddress && currentUser.mobile ? (
                    <div className="text-xs text-slate-700 space-y-0.5 bg-white p-3 rounded-lg border border-amber-100">
                      <p className="font-medium text-slate-900">{currentUser.courierAddress.streetAddress}</p>
                      {currentUser.courierAddress.landmark && (
                        <p className="text-[11px] text-slate-500">
                          Landmark: {currentUser.courierAddress.landmark}
                        </p>
                      )}
                      <p className="font-semibold text-slate-800">
                        {currentUser.courierAddress.city}, {currentUser.courierAddress.state} —{' '}
                        {currentUser.courierAddress.pincode}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-lg border border-dashed border-amber-300 text-center space-y-2">
                      <p className="text-xs text-slate-600">
                        Add your mobile number & courier address once for 1-click checkout.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(true)}
                        className="px-3 py-1.5 bg-[#18283e] text-white text-xs font-bold rounded-lg shadow-sm"
                      >
                        Add Details Now
                      </button>
                    </div>
                  )
                ) : (
                  <form onSubmit={handleSaveAddress} className="space-y-2.5 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Full Name *"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="tel"
                        required
                        value={profileMobile}
                        onChange={(e) => setProfileMobile(e.target.value)}
                        placeholder="10-digit Mobile *"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="House no., building, street *"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="Nearby landmark"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        required
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="6-digit PIN *"
                        maxLength={6}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City *"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        required
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="State *"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-2 bg-[#18283e] text-white text-xs font-bold rounded-lg hover:bg-[#121e30] transition shadow-sm"
                    >
                      Save Courier Address
                    </button>
                  </form>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                >
                  <LogOut className="size-4" />
                  <span>Sign Out</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {currentUser && profileTab === 'orders' && (
            <div className="space-y-3 text-xs">
              {activityLoading ? (
                <p className="text-center py-6 text-slate-500">Loading your orders...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-slate-500 space-y-1">
                  <Package className="size-8 mx-auto text-slate-300" />
                  <p>No orders linked to this account yet.</p>
                </div>
              ) : (
                orders.map((ord) => (
                  <div key={ord.orderId} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex justify-between font-bold text-[#18283e]">
                      <span className="font-mono">{ord.orderId}</span>
                      <span>₹{Number(ord.grandTotal || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-slate-600">
                        Status: <strong>{ord.fulfillmentStatus}</strong> · Payment: {ord.paymentStatus}
                      </p>
                      <button
                        type="button"
                        onClick={() => downloadOrderInvoice(ord)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-[#18283e] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <FileDown className="size-3 text-[#e07038]" />
                        <span>Invoice</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {currentUser && profileTab === 'sessions' && (
            <div className="space-y-3 text-xs">
              {activityLoading ? (
                <p className="text-center py-6 text-slate-500">Loading your sessions...</p>
              ) : bookings.length === 0 && workshopRegs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 space-y-1">
                  <Calendar className="size-8 mx-auto text-slate-300" />
                  <p>No consultations or workshop seats reserved yet.</p>
                </div>
              ) : (
                <>
                  {bookings.map((b) => (
                    <div key={b.bookingId} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex justify-between font-bold text-[#18283e]">
                        <span>{b.serviceName}</span>
                        <span className="font-mono">{b.bookingId}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">
                        {b.preferredDate} · {b.preferredSlot}
                      </p>
                    </div>
                  ))}
                  {workshopRegs.map((w) => (
                    <div key={w.registrationId} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
                      <div className="flex justify-between font-bold text-[#18283e]">
                        <span>{w.workshopTitle}</span>
                        <span className="font-mono">{w.registrationId}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{w.seats} seat(s) reserved</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
