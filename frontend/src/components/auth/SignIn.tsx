import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Mail, Shield } from 'lucide-react';
import { createCode, consumeCode, clearLoginAttemptInfo } from "supertokens-web-js/recipe/passwordless";

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
      
      // Use SuperTokens SDK function instead of manual API call
      const response = await createCode({ email });

      console.log('🔐 Response:', response);

      if (response.status === 'OK') {
        setOtpSent(true);
        setError('');
        console.log('✅ OTP sent successfully to:', email);
        console.log('🔐 Device ID:', response.deviceId);
        console.log('🔐 PreAuth Session ID:', response.preAuthSessionId);
        
        // Store deviceId and preAuthSessionId for OTP verification
        localStorage.setItem('supertokens_deviceId', response.deviceId);
        localStorage.setItem('supertokens_preAuthSessionId', response.preAuthSessionId);
      } else if (response.status === "SIGN_IN_UP_NOT_ALLOWED") {
        console.error('❌ Sign in/up not allowed:', response.reason);
        setError(response.reason || 'Sign in/up not allowed. Please try again.');
      } else {
        console.error('❌ OTP sending failed:', response);
        setError('Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      console.error('❌ Exception during OTP sending:', err);
      if (err.isSuperTokensGeneralError === true) {
        setError(err.message);
      } else {
        setError('An error occurred. Please try again.');
      }
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
      
      // Use SuperTokens SDK function instead of manual API call
      const response = await consumeCode({
        userInputCode: otp
      });

      console.log('🔐 Verification response:', response);

      if (response.status === "OK") {
        // Clear stored session data
        localStorage.removeItem('supertokens_deviceId');
        localStorage.removeItem('supertokens_preAuthSessionId');
        
        // Clear login attempt info
        await clearLoginAttemptInfo();
        
        setError('');
        
        if (response.createdNewRecipeUser && response.user.loginMethods.length === 1) {
          console.log('✅ User sign up successful');
        } else {
          console.log('✅ User sign in successful');
        }
        
        // Call signIn with the user data from SuperTokens
        try {
          await signIn(email, response.user);
          console.log('✅ Authentication state updated, calling onSuccess...');
          onSuccess?.();
        } catch (error) {
          console.error('❌ Error updating authentication state:', error);
          setError('Authentication successful but failed to update state. Please refresh the page.');
        }
      } else if (response.status === "INCORRECT_USER_INPUT_CODE_ERROR") {
        setError('Wrong OTP! Please try again.');
      } else if (response.status === "EXPIRED_USER_INPUT_CODE_ERROR") {
        setError('Old OTP entered. Please regenerate a new one and try again');
      } else {
        await clearLoginAttemptInfo();
        setError('Login failed. Please try again');
      }
    } catch (err: any) {
      console.error('❌ Exception during OTP verification:', err);
      if (err.isSuperTokensGeneralError === true) {
        setError(err.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError('');

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost';
      
      // Call backend to resend OTP
      const response = await fetch(`${apiBaseUrl}/auth/signinup`, {
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
