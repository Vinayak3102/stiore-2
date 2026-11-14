import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Truck,
  Sparkles,
  Edit3,
} from 'lucide-react';
import type { UserProfile, CourierAddress } from '../types/auth';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateCourierAddress,
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

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [includeCourierAddress, setIncludeCourierAddress] = useState(true);

  // Address fields
  const [streetAddress, setStreetAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');

  // UI state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const user = getCurrentUser();
      setCurrentUserState(user);
      if (user) {
        setMode('profile');
        if (user.courierAddress) {
          setStreetAddress(user.courierAddress.streetAddress || '');
          setLandmark(user.courierAddress.landmark || '');
          setCity(user.courierAddress.city || '');
          setStateName(user.courierAddress.state || 'Maharashtra');
          setPincode(user.courierAddress.pincode || '');
        }
      } else {
        setMode(initialMode === 'profile' ? 'login' : initialMode);
      }
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = loginUser(loginIdentifier, loginPassword);
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Failed to login');
      return;
    }

    setCurrentUserState(res.user);
    setSuccessMsg(`Welcome back, ${res.user.name}!`);
    setTimeout(() => {
      onSuccess?.(res.user!);
      onClose();
    }, 800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let addressData: CourierAddress | undefined = undefined;
    if (includeCourierAddress && (streetAddress.trim() || city.trim() || pincode.trim())) {
      if (!streetAddress.trim() || !city.trim() || !pincode.trim()) {
        setErrorMsg('Please complete street address, city, and PIN code.');
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

    const res = registerUser(regName, regMobile, regEmail, regPassword, addressData);
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Registration failed');
      return;
    }

    setCurrentUserState(res.user);
    setSuccessMsg(`Account created successfully! Welcome to ShivAmrit.`);
    setTimeout(() => {
      onSuccess?.(res.user!);
      onClose();
    }, 900);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg('');

    if (!streetAddress.trim() || !city.trim() || !pincode.trim()) {
      setErrorMsg('Street address, city, and 6-digit PIN code are required.');
      return;
    }

    const newAddress: CourierAddress = {
      streetAddress: streetAddress.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      state: stateName.trim() || 'India',
      pincode: pincode.trim(),
    };

    const updated = updateCourierAddress(currentUser.id, newAddress);
    if (updated) {
      setCurrentUserState(updated);
      setIsEditingAddress(false);
      setSuccessMsg('Courier address saved! Future purchases will autofill automatically.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUserState(null);
    setMode('login');
    setSuccessMsg('Signed out successfully.');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#18283e] text-white p-6 relative">
          <button
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
              <h2 className="font-serif text-xl font-bold text-white tracking-wide">
                {currentUser
                  ? `Namaste, ${currentUser.name.split(' ')[0]}`
                  : mode === 'login'
                  ? 'Sign In to Your Account'
                  : 'Create Your Sacred Account'}
              </h2>
              <p className="text-xs text-white/70 mt-0.5">
                {currentUser
                  ? 'Manage your profile and 1-click courier address'
                  : 'Save your courier address for 1-click orders anytime'}
              </p>
            </div>
          </div>

          {/* Mode switch tabs if not logged in */}
          {!currentUser && (
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
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
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

          {/* 1. LOGIN FORM */}
          {!currentUser && mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobile Number or Email ID
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="9876543210 or yourname@gmail.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#18283e] hover:bg-[#121e30] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Sign In & Load Saved Details</span>
                <span>→</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="text-xs text-[#e07038] hover:underline font-semibold"
                >
                  New customer? Register with courier address →
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {!currentUser && mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Parul Suthar"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email ID</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Create Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18283e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Courier Address Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeCourierAddress}
                    onChange={(e) => setIncludeCourierAddress(e.target.checked)}
                    className="rounded text-[#18283e] focus:ring-[#18283e]"
                  />
                  <Truck className="size-4 text-[#e07038]" />
                  <span>Save Courier Delivery Address Now (Recommended)</span>
                </label>
                <p className="text-[11px] text-slate-500 ml-6 mt-0.5">
                  Save once so you never have to type your shipping address again.
                </p>
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
                      placeholder="e.g. Flat 402, Shivam Heights, MG Road"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="Near Temple / Garden"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="400001"
                        maxLength={6}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai / Jaipur"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="e.g. Maharashtra"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#18283e] hover:bg-[#121e30] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <span>Create Account & Save Courier Address</span>
                <span>→</span>
              </button>
            </form>
          )}

          {/* 3. LOGGED IN PROFILE & COURIER ADDRESS VIEW */}
          {currentUser && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37] bg-slate-900/5 px-2 py-0.5 rounded">
                    Verified Customer
                  </span>
                  <span className="text-[11px] text-slate-400">ID: {currentUser.id.slice(-6)}</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-slate-900">{currentUser.name}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{currentUser.mobile}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{currentUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Saved Courier Address Section */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Truck className="size-4 text-[#e07038]" />
                    <span>Saved Courier Delivery Address</span>
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
                  currentUser.courierAddress ? (
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
                      <div className="flex items-center gap-1 text-[10.5px] text-emerald-700 font-bold mt-2 pt-1 border-t border-slate-100">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        <span>Autofills automatically on every purchase!</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-lg border border-dashed border-amber-300 text-center space-y-2">
                      <p className="text-xs text-slate-600">
                        You have not saved a courier address yet. Add it once to enable 1-click checkout!
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(true)}
                        className="px-3 py-1.5 bg-[#18283e] text-white text-xs font-bold rounded-lg shadow-sm"
                      >
                        Add Courier Address Now
                      </button>
                    </div>
                  )
                ) : (
                  /* Address Edit Form */
                  <form onSubmit={handleSaveAddress} className="space-y-2.5 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Street Address / Flat / Society
                      </label>
                      <input
                        type="text"
                        required
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="House no., building, street"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Landmark</label>
                        <input
                          type="text"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder="Nearby landmark"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">PIN Code</label>
                        <input
                          type="text"
                          required
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          placeholder="6-digit PIN"
                          maxLength={6}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">City</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="City"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">State</label>
                        <input
                          type="text"
                          required
                          value={stateName}
                          onChange={(e) => setStateName(e.target.value)}
                          placeholder="State"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#18283e] text-white text-xs font-bold rounded-lg hover:bg-[#121e30] transition shadow-sm mt-1"
                    >
                      Save Courier Address
                    </button>
                  </form>
                )}
              </div>

              {/* Actions */}
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
        </div>
      </div>
    </div>
  );
};
