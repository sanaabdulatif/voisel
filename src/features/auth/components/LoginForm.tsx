import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../../shared/lib/supabase';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: (session: Session) => Promise<void>;
  onError: (message: string) => void;
  onForgotPassword: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function LoginForm({
  onSuccess,
  onError,
  onForgotPassword,
  isLoading,
  setIsLoading,
}: LoginFormProps) {
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    onError('');

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      if (authData.session) {
        await onSuccess(authData.session);
      }
    } catch (err: unknown) {
      const error = err as Error;
      onError(error.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        id="email-input"
        type="email"
        label="Email Address"
        placeholder="name@example.com"
        error={errors.email?.message}
        disabled={isLoading}
        {...register('email')}
      />
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="password-input" className="text-xs font-semibold text-brand-darkText uppercase tracking-wider">
            Password
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-brand-primary font-bold hover:underline"
            disabled={isLoading}
          >
            Forgot?
          </button>
        </div>
        <input
          id="password-input"
          type="password"
          className={`premium-input ${errors.password ? 'border-brand-error focus:ring-brand-error/20 focus:border-brand-error' : ''}`}
          placeholder="••••••••"
          disabled={isLoading}
          {...register('password')}
        />
        {errors.password?.message && (
          <span className="text-xs font-medium text-brand-error mt-1.5 block">
            {errors.password.message}
          </span>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  );
}
