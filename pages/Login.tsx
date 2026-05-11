import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icon';
import { signInWithEmail, signUpWithEmail } from '../services/authService';

function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    if (!isLogin && password !== confirmPassword) {
      setMessage('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    
    let result;
    if (isLogin) {
      result = await signInWithEmail(email, password);
    } else {
      result = await signUpWithEmail(email, password);
    }
    
    setLoading(false);
    setMessage(result.message);
    
    if (result.success) {
      setTimeout(() => {
        navigate('/');
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent mx-auto flex items-center justify-center shadow-lg">
            <Icons.Clapperboard size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mt-4">CineKeep</h1>
          <p className="text-text-tertiary mt-2">收藏你的影视精彩瞬间</p>
        </div>

        <div className="bg-surface rounded-2xl p-6 shadow-xl">
          <div className="flex bg-bg rounded-xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                isLogin ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                !isLogin ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">邮箱</label>
                <div className="relative">
                  <Icons.Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full h-11 bg-bg border border-divider/30 rounded-xl pl-10 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">密码</label>
                <div className="relative">
                  <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少8个字符"
                    required
                    className="w-full h-11 bg-bg border border-divider/30 rounded-xl pl-10 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">确认密码</label>
                  <div className="relative">
                    <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入密码"
                      required
                      className="w-full h-11 bg-bg border border-divider/30 rounded-xl pl-10 pr-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                  </div>
                </div>
              )}

              {message && (
                <p className={`text-sm ${message.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icons.Loading size={16} className="animate-spin" />
                    加载中...
                  </span>
                ) : (
                  isLogin ? '登录' : '注册'
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-text-tertiary text-sm mt-6">
          登录后即可同步数据到云端
        </p>
      </div>
    </div>
  );
}

export default Login;