import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ArrowRight, LogIn, UserPlus } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../../shared/lib/supabase';
import { useAppStore } from '../../../shared/lib/store';
import { inventoryService } from '../../../shared/services/inventoryService';
import { config } from '../../../shared/lib/config';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export function AuthView() {
  const navigate = useNavigate();
  const { setSession, session } = useAppStore();

  // UI screens: 'splash' | 'login' | 'signup' | 'forgot'
  const [screen, setScreen] = useState<'splash' | 'login' | 'signup' | 'forgot'>('splash');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Splash Screen Timeout
  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => {
        setScreen('login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Redirect if logged in
  useEffect(() => {
    if (session) {
      checkShopsAndRedirect(session);
    }
  }, [session]);

  const checkShopsAndRedirect = async (sessionToCheck: Session | null = session) => {
    if (!sessionToCheck?.user?.id) return;
    try {
      const shops = await inventoryService.getShops(sessionToCheck.user.id);

      if (shops && shops.length > 0) {
        useAppStore.setState({ currentShop: shops[0] });
        navigate('/');
      } else {
        navigate('/shop-setup');
      }
    } catch (err) {
      navigate('/shop-setup');
    }
  };

  const handleLoginSuccess = async (newSession: Session) => {
    setSession(newSession);
    await checkShopsAndRedirect(newSession);
  };

  const handleSignupSuccess = async (newSession: Session | null, message: string) => {
    if (newSession) {
      setSession(newSession);
      setSuccessMsg(message);
      await checkShopsAndRedirect(newSession);
    } else {
      setSuccessMsg(message);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Google Sign-In failed.');
    } finally {
      setIsLoading(false);
    }
  };



  if (screen === 'splash') {
    return (
      <div className="fixed inset-0 bg-brand-dark flex flex-col items-center justify-center text-white z-50 p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="flex items-center gap-1.5 mb-6 h-12">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-1.5 bg-brand-success rounded-full animate-waveform"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
            <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white ml-2 shadow-premium">
              <Mic size={24} />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Voisel</h1>
          <p className="text-brand-cream/80 text-sm font-medium tracking-wide mb-8">
            “Run your fresh shop with your voice.”
          </p>
          <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-brand-success animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-softCream flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-brand-cream/60 shadow-premium overflow-hidden p-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white shadow-premium mb-3">
            <Mic size={24} />
          </div>
          <h2 className="text-2xl font-bold text-brand-dark">Welcome to Voisel</h2>
          <p className="text-sm text-brand-mutedText mt-1">Manage inventory & record sales via voice</p>
        </div>

        {/* Tab Selector */}
        {screen !== 'forgot' && (
          <div className="flex bg-brand-cream/45 p-1 rounded-xl mb-6">
            <button
              onClick={() => {
                setScreen('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                screen === 'login'
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-brand-mutedText hover:text-brand-darkText'
              }`}
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              onClick={() => {
                setScreen('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                screen === 'signup'
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-brand-mutedText hover:text-brand-darkText'
              }`}
            >
              <UserPlus size={15} />
              Create Account
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-brand-error text-xs font-semibold rounded-xl border border-brand-error/15">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-brand-primary text-xs font-semibold rounded-xl border border-brand-primary/15">
            {successMsg}
          </div>
        )}

        {/* GOOGLE SIGN IN BUTTON */}
        {screen !== 'forgot' && (
          <div className="space-y-4 mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 border border-brand-cream bg-white hover:bg-brand-cream/25 font-bold rounded-xl text-sm text-brand-darkText transition-all duration-200 shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-brand-cream" />
              <span className="px-3 text-xs font-bold text-brand-mutedText/60 uppercase tracking-wider">or email</span>
              <div className="flex-1 border-t border-brand-cream" />
            </div>
          </div>
        )}

        {/* Form Components based on screen */}
        {screen === 'login' && (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onError={setErrorMsg}
            onForgotPassword={() => {
              setScreen('forgot');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {screen === 'signup' && (
          <SignupForm
            onSuccess={handleSignupSuccess}
            onError={setErrorMsg}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {screen === 'forgot' && (
          <ForgotPasswordForm
            onSuccess={setSuccessMsg}
            onError={setErrorMsg}
            onBackToLogin={() => {
              setScreen('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}



      </div>
    </div>
  );
}
