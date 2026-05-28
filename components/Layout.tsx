import { useState, createContext, useContext, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icons } from './Icon';
import { getCurrentUser, signOut } from '../services/authService';

interface SearchContextType {
  filterText: string;
  setFilterText: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
}

const SearchContext = createContext<SearchContextType>({
  filterText: '',
  setFilterText: () => {},
  sortBy: 'date_added',
  setSortBy: () => {},
});

export const useSearchContext = () => useContext(SearchContext);

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isDetailPage = location.pathname.startsWith('/media/');

  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState('date_added');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const updateUser = async () => {
      const user = await getCurrentUser();
      setIsLoggedIn(user.isLoggedIn);
      setUserEmail(user.email);
    };
    updateUser();
  }, []);

  const handleLogout = async () => {
    await signOut();
    setIsLoggedIn(false);
    setUserEmail(null);
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: '收藏', icon: Icons.ListVideo },
    { to: '/search', label: '发现', icon: Icons.Search },
    { to: '/profile', label: '我的', icon: Icons.User },
  ];

  return (
    <SearchContext.Provider value={{ filterText, setFilterText, sortBy, setSortBy }}>
      <div className="min-h-screen bg-bg text-text-primary flex flex-col">
        {isHome && (
          <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-divider/30">
            <div className="max-w-[98vw] mx-auto px-2 sm:px-3 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-sm flex-shrink-0">
                  <Icons.Clapperboard size={16} className="text-white" />
                </div>
                
                <div className="relative w-[160px] sm:w-[200px]">
                  <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={14} />
                  <input
                    type="text"
                    placeholder="搜索..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full h-9 bg-surface border border-divider/30 rounded-full pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/30 focus:ring-2 focus:ring-accent/8 transition-all"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-9 bg-surface border border-divider/30 rounded-full px-3 text-sm text-text-primary focus:outline-none focus:border-accent/30 appearance-none cursor-pointer flex-shrink-0"
                >
                  <option value="date_added">最近</option>
                  <option value="rating">评分</option>
                  <option value="year">年份</option>
                  <option value="title">A-Z</option>
                  <option value="episode">集数</option>
                </select>

                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                  {isLoggedIn ? (
                    <>
                      <span className="text-sm text-text-secondary hidden sm:block">
                        {userEmail}
                      </span>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary text-sm font-medium transition-colors flex-shrink-0"
                      >
                        <Icons.LogOut size={15} />
                        <span className="hidden sm:inline">退出</span>
                      </button>
                    </>
                  ) : (
                    <NavLink
                      to="/login"
                      className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm flex-shrink-0"
                    >
                      <Icons.LogIn size={15} />
                      登录
                    </NavLink>
                  )}
                </div>

                <NavLink
                  to="/search"
                  className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm ml-2 flex-shrink-0"
                >
                  <Icons.Plus size={15} />
                  添加
                </NavLink>
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 w-full ${isDetailPage ? '' : 'max-w-[98vw] mx-auto px-2 sm:px-3'} ${isHome ? 'py-4' : 'py-0'}`}>
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface/90 backdrop-blur-xl border-t border-divider/40">
          <div className="grid grid-cols-3 h-[68px] max-w-lg mx-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-200 -mt-1 ${
                    isActive ? 'text-accent scale-100' : 'text-text-tertiary scale-95'
                  }`}
                >
                  <div className={`transition-all duration-200 ${
                    isActive
                      ? 'w-10 h-6 rounded-full bg-accent-light flex items-center justify-center'
                      : ''
                  }`}>
                    <item.icon size={isActive ? 18 : 20} className={`transition-all duration-200 ${isActive ? 'text-accent' : ''}`} />
                  </div>
                  <span className={`text-[10px] font-medium transition-all duration-200 ${
                    isActive ? 'text-accent opacity-100' : 'opacity-70'
                  }`}>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="h-[68px]" />
      </div>
    </SearchContext.Provider>
  );
}

export default Layout;
