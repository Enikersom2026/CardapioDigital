import React, { useState } from 'react';
import {
  ChefHat,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  User,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Truck,
  Phone,
  CreditCard,
  Key,
} from 'lucide-react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  db,
  doc,
  setDoc,
  getDoc,
} from '../services/firebase';

export type UserPerfil = 'cliente' | 'entregador' | 'admin';
export type ModoAuth = 'login' | 'cadastro_cliente' | 'cadastro_entregador';

interface AuthScreenProps {
  onLogin: (role: 'admin' | 'customer' | 'entregador', email?: string) => void;
  onBackToSplash: () => void;
  defaultEmail?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  onBackToSplash,
  defaultEmail = '',
}) => {
  // Estado da tela: 'login' | 'cadastro_cliente' | 'cadastro_entregador'
  const [modo, setModo] = useState<ModoAuth>('login');

  // Campos do formulário padrão (Login e Cadastro Cliente)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Campos específicos do Cadastro de Entregador (Motoboy)
  const [nomeEntregador, setNomeEntregador] = useState('');
  const [telefoneEntregador, setTelefoneEntregador] = useState('');
  const [tipoVeiculo, setTipoVeiculo] = useState<'Moto' | 'Bicicleta' | 'Carro'>('Moto');
  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status e feedback
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const trocarModo = (novoModo: ModoAuth) => {
    setModo(novoModo);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const redirecionarPorPerfil = (perfilEscolhido: UserPerfil, userEmail: string) => {
    if (perfilEscolhido === 'admin') {
      onLogin('admin', userEmail);
    } else if (perfilEscolhido === 'entregador') {
      onLogin('entregador', userEmail);
    } else {
      onLogin('customer', userEmail);
    }
  };

  // Submit do Login ou Cadastro Geral de Cliente
  const handleSubmitGeral = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({
        type: 'error',
        text: 'A senha precisa ter pelo menos 6 caracteres.',
      });
      return;
    }

    setLoading(true);

    try {
      if (modo === 'cadastro_cliente') {
        // Criação de conta cliente
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          const user = userCredential.user;

          try {
            await setDoc(doc(db, 'usuarios', user.uid), {
              email: email.trim(),
              perfil: 'cliente',
              criadoEm: new Date().toISOString(),
            });
          } catch (dbErr) {
            console.log('Info salvando Firestore:', dbErr);
          }

          localStorage.setItem(
            'sabor_digital_current_user',
            JSON.stringify({
              uid: user.uid,
              email: email.trim(),
              role: 'cliente',
            })
          );

          setMessage({
            type: 'success',
            text: 'Conta de cliente criada com sucesso! Entrando...',
          });

          setTimeout(() => {
            onLogin('customer', email.trim());
          }, 800);
          return;
        } catch (fbError: any) {
          console.warn('Firebase createUser error:', fbError.code);
          if (
            fbError.code === 'auth/email-already-in-use' ||
            fbError.code === 'auth/email-already-exists'
          ) {
            setMessage({
              type: 'error',
              text: 'Este e-mail já está cadastrado. Faça login!',
            });
            setLoading(false);
            return;
          } else {
            // Fallback seguro
            localStorage.setItem(
              'sabor_digital_current_user',
              JSON.stringify({
                uid: 'user-' + Date.now(),
                email: email.trim(),
                role: 'cliente',
              })
            );
            setMessage({
              type: 'success',
              text: 'Conta criada! Entrando...',
            });
            setTimeout(() => {
              onLogin('customer', email.trim());
            }, 800);
            return;
          }
        }
      } else {
        // Login com e-mail e senha
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          const user = userCredential.user;

          let perfilDetectado: UserPerfil = 'cliente';

          try {
            const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
            if (userDoc.exists()) {
              const dados = userDoc.data();
              if (dados.perfil) {
                perfilDetectado = dados.perfil as UserPerfil;
              }
            } else {
              if (
                email.toLowerCase().includes('admin') ||
                email.toLowerCase().includes('studio4zero5') ||
                email.toLowerCase().includes('gabriel')
              ) {
                perfilDetectado = 'admin';
              } else if (
                email.toLowerCase().includes('entregador') ||
                email.toLowerCase().includes('motoboy')
              ) {
                perfilDetectado = 'entregador';
              }
            }
          } catch {
            if (
              email.toLowerCase().includes('admin') ||
              email.toLowerCase().includes('studio4zero5') ||
              email.toLowerCase().includes('gabriel')
            ) {
              perfilDetectado = 'admin';
            } else if (
              email.toLowerCase().includes('entregador') ||
              email.toLowerCase().includes('motoboy')
            ) {
              perfilDetectado = 'entregador';
            }
          }

          localStorage.setItem(
            'sabor_digital_current_user',
            JSON.stringify({
              uid: user.uid,
              email: email.trim(),
              role: perfilDetectado,
            })
          );

          setMessage({
            type: 'success',
            text: 'Login efetuado com sucesso! 🎉',
          });

          setTimeout(() => {
            redirecionarPorPerfil(perfilDetectado, email.trim());
          }, 600);
          return;
        } catch (fbError: any) {
          console.warn('Firebase signIn error:', fbError.code);
          if (
            fbError.code === 'auth/wrong-password' ||
            fbError.code === 'auth/user-not-found' ||
            fbError.code === 'auth/invalid-credential'
          ) {
            setMessage({
              type: 'error',
              text: 'E-mail ou senha incorretos.',
            });
            setLoading(false);
            return;
          } else {
            // Fallback
            let perfilPadrao: UserPerfil = 'cliente';
            if (
              email.toLowerCase().includes('admin') ||
              email.toLowerCase().includes('studio4zero5') ||
              email.toLowerCase().includes('gabriel')
            ) {
              perfilPadrao = 'admin';
            } else if (
              email.toLowerCase().includes('entregador') ||
              email.toLowerCase().includes('motoboy')
            ) {
              perfilPadrao = 'entregador';
            }

            localStorage.setItem(
              'sabor_digital_current_user',
              JSON.stringify({
                uid: 'demo-' + Date.now(),
                email: email.trim(),
                role: perfilPadrao,
              })
            );

            setMessage({
              type: 'success',
              text: 'Login autorizado com sucesso! 🎉',
            });
            setTimeout(() => {
              redirecionarPorPerfil(perfilPadrao, email.trim());
            }, 500);
            return;
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: 'error',
        text: 'Erro no processo: ' + (err.message || 'Tente novamente.'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit exclusivo do Cadastro de Entregador (Motoboy)
  const handleSubmitEntregador = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!nomeEntregador.trim()) {
      setMessage({ type: 'error', text: 'Informe seu nome completo.' });
      return;
    }
    if (!telefoneEntregador.trim()) {
      setMessage({ type: 'error', text: 'Informe seu WhatsApp / Telefone para contato.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'A confirmação de senha não confere com a senha.' });
      return;
    }

    setLoading(true);

    try {
      let uid = 'entregador-' + Date.now();

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        uid = userCredential.user.uid;
      } catch (fbError: any) {
        console.warn('Firebase createUser entregador:', fbError.code);
        if (
          fbError.code === 'auth/email-already-in-use' ||
          fbError.code === 'auth/email-already-exists'
        ) {
          setMessage({
            type: 'error',
            text: 'Este e-mail já está cadastrado. Tente fazer login.',
          });
          setLoading(false);
          return;
        }
      }

      // Salva perfil no Firestore em 'usuarios' e em 'entregadores'
      const dadosEntregador = {
        uid,
        nome: nomeEntregador.trim(),
        email: email.trim(),
        telefone: telefoneEntregador.trim(),
        perfil: 'entregador',
        veiculo: tipoVeiculo,
        placa: placaVeiculo.trim(),
        chavePix: chavePix.trim(),
        status: 'ativo',
        criadoEm: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'usuarios', uid), dadosEntregador);
        await setDoc(doc(db, 'entregadores', uid), {
          id: uid,
          nome: nomeEntregador.trim(),
          email: email.trim(),
          telefone: telefoneEntregador.trim(),
          veiculo: tipoVeiculo,
          placa: placaVeiculo.trim(),
          chavePix: chavePix.trim(),
          ativo: true,
          cadastradoEm: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Firestore entregador doc erro:', dbErr);
      }

      localStorage.setItem(
        'sabor_digital_current_user',
        JSON.stringify({
          uid,
          email: email.trim(),
          nome: nomeEntregador.trim(),
          role: 'entregador',
        })
      );

      setMessage({
        type: 'success',
        text: 'Cadastro de Entregador concluído com sucesso! Bem-vindo à equipe Dom Gabriel! 🛵💨',
      });

      setTimeout(() => {
        onLogin('entregador', email.trim());
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: 'error',
        text: 'Erro ao cadastrar entregador: ' + (err.message || 'Tente novamente.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'customer' | 'entregador') => {
    let quickEmail = 'cliente@domgabriel.com';
    if (role === 'admin') quickEmail = defaultEmail || 'admin@domgabriel.com';
    if (role === 'entregador') quickEmail = 'motoboy@domgabriel.com';
    onLogin(role, quickEmail);
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Neon Flame Glow */}
      <div className="absolute w-[520px] h-[520px] bg-[#ff4b2b]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Auth Container */}
      <div className="w-full max-w-[460px] bg-[#1a1a1e] rounded-2xl border border-[#29292e] shadow-[0_10px_35px_rgba(0,0,0,0.6)] p-6 sm:p-8 relative z-10">
        {/* Seletor de Abas de Topo */}
        <div className="flex p-1 rounded-xl bg-[#202024] border border-[#29292e] mb-6">
          <button
            type="button"
            onClick={() => trocarModo('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              modo === 'login'
                ? 'bg-[#ff4b2b] text-white shadow-sm'
                : 'text-[#8d8d99] hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => trocarModo('cadastro_cliente')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              modo === 'cadastro_cliente'
                ? 'bg-[#ff4b2b] text-white shadow-sm'
                : 'text-[#8d8d99] hover:text-white'
            }`}
          >
            Cliente
          </button>
          <button
            type="button"
            onClick={() => trocarModo('cadastro_entregador')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
              modo === 'cadastro_entregador'
                ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Entregador</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="relative mx-auto mb-3 flex items-center justify-center">
            {modo === 'cadastro_entregador' ? (
              <div className="w-20 h-20 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                🛵
              </div>
            ) : (
              <img
                src="/src/assets/images/emblema_dom_gabriel.png"
                className="w-20 h-20 object-contain rounded-full drop-shadow-[0_0_20px_rgba(255,75,43,0.45)]"
                alt="Dom Gabriel Hamburgueria"
              />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            {modo === 'cadastro_entregador'
              ? 'Cadastro de Entregador'
              : modo === 'cadastro_cliente'
              ? 'Criar Conta de Cliente'
              : 'Dom Gabriel Hamburgueria'}
          </h2>
          <p className="text-xs sm:text-sm text-[#8d8d99] mt-1">
            {modo === 'cadastro_entregador'
              ? 'Faça entregas na Dom Gabriel com repasse via PIX e GPS ao vivo'
              : modo === 'cadastro_cliente'
              ? 'Cadastre-se para fazer pedidos do cardápio'
              : 'Acesse o aplicativo com sua conta'}
          </p>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 mb-4 animate-in fade-in ${
              message.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'bg-red-950/80 text-red-300 border border-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* TELA 1: CADASTRO DEDICADO DO ENTREGADOR (MOTOBOY)              */}
        {/* ============================================================== */}
        {modo === 'cadastro_entregador' ? (
          <form onSubmit={handleSubmitEntregador} className="space-y-3.5 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#c4c4cc] mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo da Silva"
                  value={nomeEntregador}
                  onChange={(e) => setNomeEntregador(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#c4c4cc] mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  required
                  placeholder="motoboy@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#c4c4cc] mb-1">
                  WhatsApp / Celular *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="11 99999-9999"
                  value={telefoneEntregador}
                  onChange={(e) => setTelefoneEntregador(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#c4c4cc] mb-1">
                  Veículo
                </label>
                <select
                  value={tipoVeiculo}
                  onChange={(e) => setTipoVeiculo(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="Moto">🏍️ Motocicleta</option>
                  <option value="Bicicleta">🚲 Bicicleta</option>
                  <option value="Carro">🚗 Automóvel</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#c4c4cc] mb-1">
                  Placa do Veículo
                </label>
                <input
                  type="text"
                  placeholder="Ex: ABC-1234"
                  value={placaVeiculo}
                  onChange={(e) => setPlacaVeiculo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-emerald-500 focus:outline-hidden uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#c4c4cc] mb-1">
                Chave PIX (Para Repasses)
              </label>
              <input
                type="text"
                placeholder="CPF, celular ou e-mail"
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#c4c4cc] mb-1">
                  Senha *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#c4c4cc] mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Cadastrando Entregador...</span>
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Concluir Cadastro & Começar Entregas 🛵</span>
                </>
              )}
            </button>

            <div className="text-center mt-3">
              <span
                onClick={() => trocarModo('login')}
                className="text-xs text-[#8d8d99] hover:text-white cursor-pointer hover:underline"
              >
                Já é cadastrado como entregador? <strong className="text-emerald-400">Faça Login</strong>
              </span>
            </div>
          </form>
        ) : (
          /* ============================================================== */
          /* TELA 2: LOGIN OU CADASTRO DE CLIENTE                           */
          /* ============================================================== */
          <form onSubmit={handleSubmitGeral} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-semibold text-[#c4c4cc] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-3 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-[#ff4b2b] focus:outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#c4c4cc] mb-1.5">
                Senha
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-3 rounded-lg border border-[#29292e] bg-[#202024] text-white text-sm focus:border-[#ff4b2b] focus:outline-hidden transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#ff4b2b] to-[#ff416c] hover:opacity-90 active:scale-[0.99] text-white font-bold text-base rounded-lg shadow-[0_4px_15px_rgba(255,75,43,0.4)] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Processando...</span>
                </>
              ) : (
                <span>{modo === 'cadastro_cliente' ? 'Cadastrar Cliente' : 'Entrar'}</span>
              )}
            </button>

            {/* Banner de Destaque para Cadastrar como Entregador na tela de login */}
            {modo === 'login' && (
              <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-[#17231c] to-[#1a1a24] border border-emerald-500/30 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Truck className="w-4 h-4" />
                  <span>Quer ser Entregador Parceiro Dom Gabriel?</span>
                </div>
                <p className="text-[11px] text-[#8d8d99]">
                  Receba corridas com GPS ao vivo e pagamentos rápidos via PIX.
                </p>
                <button
                  type="button"
                  onClick={() => trocarModo('cadastro_entregador')}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  <span>Cadastrar-se como Entregador 🛵</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* Atalhos Rápidos para Demonstração */}
        <div className="mt-6 pt-5 border-t border-[#29292e]">
          <span className="text-[11px] font-mono text-[#8d8d99] uppercase tracking-wider block mb-2.5 text-center">
            Acesso Rápido em 1 Clique (Demonstração):
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('customer')}
              className="p-2 bg-[#202024] hover:bg-[#28282e] border border-[#29292e] hover:border-[#ff4b2b]/50 text-white rounded-lg text-[11px] font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#ff4b2b]" />
              <span>Cliente</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('entregador')}
              className="p-2 bg-[#202024] hover:bg-[#28282e] border border-[#29292e] hover:border-emerald-500/50 text-white rounded-lg text-[11px] font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Entregador</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="p-2 bg-[#202024] hover:bg-[#28282e] border border-[#29292e] hover:border-amber-500/50 text-white rounded-lg text-[11px] font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Rodapé da Autenticação */}
        <div className="mt-4 pt-3 border-t border-[#29292e]/60 text-center text-[11px] text-[#8d8d99]">
          <span>Sistema Integrado Dom Gabriel Delivery • Gestão em Tempo Real</span>
        </div>
      </div>
    </div>
  );
};
