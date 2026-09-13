import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { loginWithEmailAndPassword } from '../api/login';
import { useAuth } from '../../../hooks/useAuth';
import { apiClient } from '../../../lib/axios';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const { login, setUser } = useAuth();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as any),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMsg('');
    try {
      const res = await loginWithEmailAndPassword(data);
      if (res.token) {
        login(res.token);
      } else {
        login('dummy-token-for-now'); // Fallback if backend doesn't return token
      }
      
      // Fetch full user profile including permissions
      const meRes = await apiClient.get('/users/me');
      if (meRes.data.data) {
        setUser(meRes.data.data);
      }
      
      navigate('/');
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-1)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: '4px' }}>Welcome back</h2>
        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Enter your details to access your account</p>
      </div>

      {errorMsg && (
        <div style={{ 
          padding: '8px 12px', 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          color: 'var(--status-error)', 
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--font-size-xs)',
          textAlign: 'center'
        }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label htmlFor="email" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
        <input 
          id="email" 
          type="email" 
          placeholder="admin@masterh.com"
          {...register('email')}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'rgba(15, 23, 42, 0.5)',
            border: `1px solid ${errors.email ? 'var(--status-error)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-sm)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: 'var(--font-size-sm)',
            transition: 'all var(--transition-fast)',
            backdropFilter: 'blur(10px)'
          }}
          onFocus={(e) => { 
            if(!errors.email) {
              e.target.style.borderColor = 'var(--brand-primary)';
              e.target.style.boxShadow = '0 0 0 1px rgba(245, 158, 11, 0.2)';
            }
          }}
          onBlur={(e) => { 
            if(!errors.email) {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.boxShadow = 'none';
            }
          }}
        />
        {errors.email && <span style={{ color: 'var(--status-error)', fontSize: '11px', marginTop: '2px' }}>{errors.email.message}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <label htmlFor="password" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
          <a href="#" style={{ fontSize: '11px' }}>Forgot password?</a>
        </div>
        <input 
          id="password" 
          type="password" 
          placeholder="••••••••"
          {...register('password')}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'rgba(15, 23, 42, 0.5)',
            border: `1px solid ${errors.password ? 'var(--status-error)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-sm)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: 'var(--font-size-sm)',
            transition: 'all var(--transition-fast)',
            backdropFilter: 'blur(10px)'
          }}
          onFocus={(e) => { 
            if(!errors.password) {
              e.target.style.borderColor = 'var(--brand-primary)';
              e.target.style.boxShadow = '0 0 0 1px rgba(245, 158, 11, 0.2)';
            }
          }}
          onBlur={(e) => { 
            if(!errors.password) {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.boxShadow = 'none';
            }
          }}
        />
        {errors.password && <span style={{ color: 'var(--status-error)', fontSize: '11px', marginTop: '2px' }}>{errors.password.message}</span>}
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          color: 'var(--bg-primary)',
          border: 'none',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          marginTop: 'var(--spacing-1)',
          opacity: isSubmitting ? 0.7 : 1,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          transition: 'all var(--transition-fast)',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
        }}
        onMouseEnter={(e) => { 
          if(!isSubmitting) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.35)';
          }
        }}
        onMouseLeave={(e) => { 
          if(!isSubmitting) {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.25)';
          }
        }}
      >
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
