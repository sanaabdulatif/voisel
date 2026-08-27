import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../../shared/lib/supabase';
import { config } from '../../../shared/lib/config';
import { useAppStore } from '../../../shared/lib/store';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSuccess: (session: Session | null, message: string) => Promise<void>;
  onError: (message: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function SignupForm({
  onSuccess,
  onError,
  isLoading,
  setIsLoading,
}: SignupFormProps) {

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    onError('');

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });
      if (error) throw error;
      if (authData.session) {
        await onSuccess(authData.session, 'Account created successfully! Redirecting...');
      } else {
        await onSuccess(null, 'Account created successfully! Please check your email to confirm your account.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      onError(error.message || 'Signup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        id="fullname-input"
        type="text"
        label="Full Name"
        placeholder="John Doe"
        error={errors.fullName?.message}
        disabled={isLoading}
        {...register('fullName')}
      />
      <Input
        id="signup-email"
        type="email"
        label="Email Address"
        placeholder="name@example.com"
        error={errors.email?.message}
        disabled={isLoading}
        {...register('email')}
      />
      <Input
        id="signup-pass"
        type="password"
        label="Password"
        placeholder="Min 6 characters"
        error={errors.password?.message}
        disabled={isLoading}
        {...register('password')}
      />

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}
