'use client';

import AgricultureIcon from '@mui/icons-material/Agriculture';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { API_URL, authApi, errorMessage } from '@/lib/api';
import { setSession, useSession } from '@/lib/session';
import type { SendOtpResponse } from '@/lib/types';

const PHONE_RE = /^(\+91)?[6-9]\d{9}$|^\+\d{10,15}$/;

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState<SendOtpResponse | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Already signed in as admin -> go to the dashboard.
  useEffect(() => {
    if (session?.user.role === 'ADMIN') router.replace('/');
  }, [session, router]);

  const sendOtp = useMutation({
    mutationFn: (p: string) => authApi.sendOtp(p),
    onSuccess: (res) => {
      setOtp(res);
      setError(null);
      if (res.devCode) setCode(res.devCode);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const verifyOtp = useMutation({
    mutationFn: () => authApi.verifyOtp(otp?.phone ?? phone.trim(), code.trim()),
    onSuccess: (res) => {
      if (res.user.role !== 'ADMIN') {
        // Don't keep a farmer/expert session around in the admin app; revoke it server-side.
        setSession(null);
        void fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: res.refreshToken }),
        }).catch(() => undefined);
        setError(
          `This phone number is registered as ${res.user.role}, not ADMIN. Only agriculture staff with admin access can sign in here.`,
        );
        return;
      }
      setSession({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
      router.replace('/');
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const onSendOtp = (e: FormEvent) => {
    e.preventDefault();
    const p = phone.replace(/[\s-]/g, '');
    if (!PHONE_RE.test(p)) {
      setPhoneError('Enter a 10-digit Indian mobile number or an E.164 number (e.g. +919876543210)');
      return;
    }
    setPhoneError(null);
    sendOtp.mutate(p);
  };

  const onVerify = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(code.trim())) {
      setError('Enter the numeric code sent to your phone');
      return;
    }
    setError(null);
    verifyOtp.mutate();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(160deg, #e8f5e9 0%, #f4f7f1 50%, #fff8e1 100%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }} variant="elevation" elevation={3}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: '50%',
                p: 1.5,
                display: 'flex',
              }}
            >
              <AgricultureIcon fontSize="large" />
            </Box>
            <Typography variant="h5" component="h1">
              Krishi Saathi Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Sign in with your registered staff phone number
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {!otp ? (
            <Box component="form" onSubmit={onSendOtp} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  autoFocus
                  fullWidth
                  size="medium"
                  required
                  error={Boolean(phoneError)}
                  helperText={phoneError ?? '10-digit mobile number'}
                  slotProps={{ htmlInput: { inputMode: 'tel', autoComplete: 'tel' } }}
                />
                <Button type="submit" variant="contained" size="large" disabled={sendOtp.isPending}>
                  {sendOtp.isPending ? <CircularProgress size={22} color="inherit" /> : 'Send OTP'}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={onVerify} noValidate>
              <Stack spacing={2}>
                <Typography variant="body2">
                  Code sent to <strong>{otp.phone}</strong>. It expires in {Math.round(otp.expiresInSeconds / 60)}{' '}
                  min.{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => {
                      setOtp(null);
                      setCode('');
                      setError(null);
                    }}
                  >
                    Change number
                  </Link>
                </Typography>
                {otp.devCode && (
                  <Alert severity="info">
                    Dev mode: your code is <strong>{otp.devCode}</strong> (pre-filled).
                  </Alert>
                )}
                <TextField
                  label="OTP code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  fullWidth
                  size="medium"
                  required
                  slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 8 } }}
                />
                <Button type="submit" variant="contained" size="large" disabled={verifyOtp.isPending}>
                  {verifyOtp.isPending ? <CircularProgress size={22} color="inherit" /> : 'Verify & sign in'}
                </Button>
                <Button
                  variant="text"
                  disabled={sendOtp.isPending}
                  onClick={() => sendOtp.mutate(otp.phone)}
                >
                  Resend code
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
