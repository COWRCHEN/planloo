/**
 * Verify Email Handler
 *
 * Automatically verifies email token from URL and shows result.
 * Uses TanStack Query for mutations.
 */

import { useEffect, useState } from 'react';
import { useVerifyEmail } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function VerifyEmailHandler() {
  const [token, setToken] = useState<string | null>(null);
  const [callbackURL, setCallbackURL] = useState<string>('/dashboard');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const verifyEmail = useVerifyEmail();

  // Extract token from URL and trigger verification
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const callbackParam = urlParams.get('callbackURL');

    if (callbackParam) {
      setCallbackURL(callbackParam);
    }

    if (tokenParam) {
      setToken(tokenParam);
      // Auto-verify on mount
      verifyEmail.mutate({ token: tokenParam });
    } else {
      setTokenError('Invalid or missing verification token.');
    }
  }, []);

  // Loading state
  if (verifyEmail.isPending) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <p className="text-muted-foreground">Verifying your email address...</p>
      </div>
    );
  }

  // Success state
  if (verifyEmail.isSuccess) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <Alert variant="success">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Email verified successfully!</p>
              <p>Your email address has been verified. You can now access all features.</p>
            </div>
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <a href={callbackURL}>Continue to {callbackURL === '/dashboard' ? 'Dashboard' : 'App'}</a>
        </Button>
      </div>
    );
  }

  // Error state (from verification attempt)
  if (verifyEmail.isError) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Verification failed</p>
              <p>{verifyEmail.error.message}</p>
            </div>
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => token && verifyEmail.mutate({ token })}
          >
            Try again
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <a href="/login">Back to sign in</a>
          </Button>
        </div>
      </div>
    );
  }

  // Missing token error
  if (tokenError) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <Alert variant="destructive">
          <AlertDescription>{tokenError}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <a href="/login">Back to sign in</a>
        </Button>
      </div>
    );
  }

  return null;
}
