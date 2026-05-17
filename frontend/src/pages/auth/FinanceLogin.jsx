import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function FinanceLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const isFinanceUser = (role, userType) => {
    const roleOk = role === 'finance';
    const userTypeOk = userType === 'finance';
    return roleOk && userTypeOk;
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);

    if (result.success) {
      if (isFinanceUser(result.role, result.userType)) {
        toast.success('Welcome to Finance Dashboard!');
        navigate('/finance');
      } else {
        // Revoke session for non-finance users logging in through finance portal.
        logout();
        toast.error('Access denied. Finance account required.');
      }
    } else {
      toast.error(result.error);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-emerald-800 to-teal-800 flex items-center justify-center p-4">
      <Toaster position="top-right" />

      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center space-x-2 mb-8">
          <div className="bg-white p-3 rounded-xl shadow-lg">
            <BarChart3 className="text-green-700" size={32} />
          </div>
          <span className="text-3xl font-bold text-white">Finance Portal</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-slide-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Login</h1>
            <p className="text-gray-600">Sign in with your finance account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="finance.user@company.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loading size="sm" /> : 'Login to Finance'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Not a finance user?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Go to Main Login
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white text-sm mt-8">© 2026 VissaAssist</p>
      </div>
    </div>
  );
}
