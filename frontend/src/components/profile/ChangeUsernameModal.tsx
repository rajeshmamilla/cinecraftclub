import { API_BASE_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { X, UserCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface ChangeUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  verifiedEmail: string;
  token: string | null;
  onSuccess: (newToken: string, newUsername: string) => void;
}

export default function ChangeUsernameModal({
  isOpen,
  onClose,
  verifiedEmail,
  token,
  onSuccess
}: ChangeUsernameModalProps) {
  const [newUsername, setNewUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setNewUsername('');
    setStep('request');
    setError('');
    setOtpCode('');
  }, [isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-username/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to send security OTP');
      }

      toast.success('Security authorization code sent to your email!');
      setStep('verify');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!newUsername || newUsername.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-username/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: otpCode, newUsername: newUsername.trim() })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to change username');
      }

      const data = await response.json(); // returns { token }
      toast.success('Username updated successfully!');
      onSuccess(data.token, newUsername.trim());
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
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Change Username</h2>
          <p className="text-xs text-muted-foreground">
            For security reasons, changing your username requires an OTP sent to your verified email.
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
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-muted-foreground text-left leading-relaxed">
              We will send a 6-digit verification code to your verified email: <strong className="text-white">{verifiedEmail}</strong>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2 text-sm mt-4 cursor-pointer"
            >
              {isLoading ? 'Sending Code...' : 'Send Security OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmChange} className="space-y-4">
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-muted-foreground text-left mb-2 leading-relaxed">
              Enter the 6-digit verification code sent to <strong className="text-white">{verifiedEmail}</strong> and your new username.
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block text-left">New Username</label>
                <input 
                  type="text" 
                  placeholder="new_cinephile_name"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors focus:ring-1 focus:ring-primary"
                />
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
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2 text-sm mt-4 cursor-pointer"
            >
              {isLoading ? 'Updating...' : 'Confirm Change Username'}
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
          </form>
        )}
      </div>
    </div>
  );
}
