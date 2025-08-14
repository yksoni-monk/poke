import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Mail, Shield } from 'lucide-react';

interface SignInProps {
  onSuccess?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSuccess }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Sending OTP to:', email);
      
      // Call backend SuperTokens endpoint to send OTP
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost'}/auth/signinup/code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      console.log('🔐 Response status:', response.status);
      console.log('🔐 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔐 Response data:', data);
        
        if (data.status === 'OK') {
          setOtpSent(true);
          setError('');
          console.log('✅ OTP sent successfully to:', email);
          console.log('🔐 Device ID:', data.deviceId);
          console.log('🔐 PreAuth Session ID:', data.preAuthSessionId);
          
          // Store deviceId and preAuthSessionId for OTP verification
          localStorage.setItem('supertokens_deviceId', data.deviceId);
          localStorage.setItem('supertokens_preAuthSessionId', data.preAuthSessionId);
        } else {
          console.error('❌ OTP sending failed:', data);
          setError(data.message || 'Failed to send OTP. Please try again.');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ HTTP error:', errorData);
        setError(errorData.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      console.error('❌ Exception during OTP sending:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Verifying OTP:', otp);
      
      // Get stored deviceId and preAuthSessionId
      const deviceId = localStorage.getItem('supertokens_deviceId');
      const preAuthSessionId = localStorage.getItem('supertokens_preAuthSessionId');

      console.log('🔐 Device ID from storage:', deviceId);
      console.log('🔐 PreAuth Session ID from storage:', preAuthSessionId);

      if (!deviceId || !preAuthSessionId) {
        console.error('❌ Missing session data');
        setError('OTP session expired. Please request a new OTP.');
        return;
      }

      // Call backend SuperTokens endpoint to verify OTP
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost'}/auth/signinup/code/consume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: deviceId,
          preAuthSessionId: preAuthSessionId,
          userInputCode: otp,
        }),
      });

      console.log('🔐 Verification response status:', response.status);
      console.log('🔐 Verification response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔐 Verification response data:', data);
        
        if (data.status === 'OK') {
          // Clear stored session data
          localStorage.removeItem('supertokens_deviceId');
          localStorage.removeItem('supertokens_preAuthSessionId');
          
          setError('');
          
          // Use the user data from the OTP verification response directly
          // This bypasses the problematic session endpoint
          console.log('✅ OTP verification successful! User data:', data.user);
          
          // Call signIn with the user data we already have
          try {
            await signIn(email, data.user);
            console.log('✅ Authentication state updated, calling onSuccess...');
            onSuccess?.();
          } catch (error) {
            console.error('❌ Error updating authentication state:', error);
            setError('Authentication successful but failed to update state. Please refresh the page.');
          }
        } else {
          console.error('❌ OTP verification failed:', data);
          setError('Invalid OTP. Please try again.');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ HTTP error during verification:', errorData);
        setError(errorData.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error('❌ Exception during OTP verification:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Call backend to resend OTP
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost'}/auth/signinup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      if (response.ok) {
        setError('');
        console.log('OTP resent to:', email);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error resending OTP:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (otpSent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Enter Verification Code</CardTitle>
          <CardDescription>
            We've sent a verification code to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !otp}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Sign In'
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="text-sm"
              >
                Didn't receive the code? Resend
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setError('');
                }}
                className="text-sm"
              >
                Use different email
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>Sign In to Pokemon Scanner</CardTitle>
        <CardDescription>
          Enter your email to receive a verification code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Code...
              </>
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
