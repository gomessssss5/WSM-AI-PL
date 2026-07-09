import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { Sparkles, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          throw new Error('Por favor, informe seu nome.');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: name
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Ocorreu um erro ao realizar a autenticação.';
      
      // Map newer and legacy Firebase auth errors to secure, readable Portuguese messages
      if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found'
      ) {
        errorMsg = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'Este endereço de e-mail já está sendo utilizado.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'O endereço de e-mail informado é inválido.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'A senha deve conter no mínimo 6 caracteres.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Muitas tentativas malsucedidas de login. Por favor, tente novamente mais tarde.';
      } else if (err.message && err.message.includes('auth/invalid-credential')) {
        errorMsg = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (err.message) {
        // Clean any residual "Firebase: Error" prefix if present
        errorMsg = err.message.replace(/^Firebase:\s*/, '');
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      // In typical nested preview iframes, popup could be blocked or fail.
      // So we handle errors gracefully and suggest redirect if popup fails.
      try {
        await signInWithPopup(auth, googleProvider);
        onLoginSuccess();
      } catch (popupErr: any) {
        console.warn("Popup blocked or failed, trying redirect: ", popupErr);
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao entrar com Google. Tente novamente ou use E-mail e Senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="wsm-login-container" className="flex h-[100dvh] w-screen items-center justify-center bg-[#fcfbfa] relative overflow-hidden select-none dot-grid p-4">
      {/* Ambient background glows */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] glow-left pointer-events-none rounded-full" />
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] glow-right pointer-events-none rounded-full" />

      <div className="relative z-10 w-full max-w-[400px] bg-white border border-[#eae6e1] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-6 md:p-8 flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#5c53e5] rounded-xl flex items-center justify-center shadow-md animate-pulse">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              className="w-6 h-6 text-white"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            WSM AI Hub
          </h1>
          <p className="text-[12px] text-gray-400 font-medium max-w-[280px]">
            Acesse o ecossistema com os modelos de IA mais rápidos do mercado
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-[11.5px] leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Traditional Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5">
          {isSignUp && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#fcfbfa] border border-[#eae6e1] rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5c53e5] focus:ring-1 focus:ring-[#5c53e5]/25 transition-all font-medium"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder="Endereço de e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#fcfbfa] border border-[#eae6e1] rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5c53e5] focus:ring-1 focus:ring-[#5c53e5]/25 transition-all font-medium"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              placeholder="Senha de segurança"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#fcfbfa] border border-[#eae6e1] rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5c53e5] focus:ring-1 focus:ring-[#5c53e5]/25 transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#1f1e1d] hover:bg-[#343230] text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
          >
            <span>{isSignUp ? 'Criar minha conta' : 'Entrar com E-mail'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Separator */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#eae6e1]"></div>
          <span className="flex-shrink mx-3 text-gray-400 text-[10px] uppercase font-bold tracking-wider">ou</span>
          <div className="flex-grow border-t border-[#eae6e1]"></div>
        </div>

        {/* Google OAuth Provider */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 bg-white border border-[#eae6e1] hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] transition-all"
        >
          {/* Official Google Vector Logo */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.5 15.01 0 12 0 7.35 0 3.39 2.67 1.5 6.57l3.86 3C6.26 6.94 8.89 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.67-2.33 3.51l3.61 2.8c2.11-1.95 3.78-4.83 3.78-8.46z"
            />
            <path
              fill="#FBBC05"
              d="M5.36 14.43c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.5 6.85C.54 8.78 0 10.94 0 13.2s.54 4.42 1.5 6.35l3.86-3.12z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.61-2.8c-1.1.74-2.51 1.18-4.35 1.18-3.11 0-5.74-1.9-6.69-4.53l-3.86 3C3.39 21.33 7.35 24 12 24z"
            />
          </svg>
          <span>Continuar com o Google</span>
        </button>

        {/* View Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[11px] text-gray-500 hover:text-[#5c53e5] font-semibold transition-colors cursor-pointer"
          >
            {isSignUp ? 'Já possui uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se grátis'}
          </button>
        </div>
      </div>
    </div>
  );
}
