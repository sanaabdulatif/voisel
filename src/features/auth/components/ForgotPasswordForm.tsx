import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { supabase } from '../../../shared/lib/supabase';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onBackToLogin: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function ForgotPasswordForm({
  onSuccess,
  onError,
  onBackToLogin,
  isLoading,
  setIsLoading,
}: ForgotPasswordFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    onError('');
    onSuccess('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email);
      if (error) throw error;
      onSuccess('Reset password instructions sent to your email.');
    } catch (err: unknown) {
      const error = err as Error;
      onError(error.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        id="forgot-email"
        type="email"
        label="Reset Password Email"
        placeholder="name@example.com"
        error={errors.email?.message}
        disabled={isLoading}
        {...register('email')}
      />
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </Button>
      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full text-center text-xs font-bold text-brand-mutedText hover:text-brand-darkText pt-2"
        disabled={isLoading}
      >
        Back to Login
      </button>
    </form>
  );
}
