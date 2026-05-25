import { API_BASE_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { X, Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  token: string | null;
  onVerified: (verifiedEmail: string) => void;
}

export default function VerificationModal({
  isOpen,
  onClose,
  currentEmail,
  token,
  onVerified
}: VerificationModalProps) {
  const [email, setEmail] = useState(currentEmail);
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setEmail(currentEmail);
    setStep('request');
    setError('');
    setOtpCode('');
  }, [currentEmail, isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-verification-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to send OTP code');
      }

      toast.success('Verification OTP code sent successfully!');
      setStep('verify');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otpCode || otpCode.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, code: otpCode })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Verification failed');
      }

      toast.success('Email verified successfully!');
      onVerified(email);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#12121a]/90 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verify Email Address</h2>
          <p className="text-xs text-muted-foreground">
            Verify your email address to enable security alerts and account recovery.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2 text-xs text-red-400">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block text-left">Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors focus:ring-1 focus:ring-primary"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2 text-sm mt-4 cursor-pointer"
            >
              {isLoading ? 'Sending Code...' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-muted-foreground text-left mb-2 leading-relaxed">
              We sent a 6-digit OTP to <strong className="text-white">{email}</strong>. Enter it below to complete verification.
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block text-left">Verification Code</label>
              <input 
                type="text" 
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-lg font-bold text-center tracking-widest text-white focus:outline-none focus:border-primary transition-colors focus:ring-1 focus:ring-primary placeholder:tracking-normal placeholder:font-normal"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2 text-sm mt-4 cursor-pointer"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="text-center mt-4">
              {countdown > 0 ? (
                <p className="text-xs text-muted-foreground">Resend code in {countdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="text-xs text-primary hover:underline font-semibold bg-transparent border-0 cursor-pointer"
                >
                  Resend OTP Code
                </button>
              )}
            </div>

            <button 
              type="button"
              onClick={() => setStep('request')}
              className="w-full text-center text-xs text-muted-foreground hover:text-white hover:underline mt-2 bg-transparent border-0 cursor-pointer"
            >
              Change email address
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
