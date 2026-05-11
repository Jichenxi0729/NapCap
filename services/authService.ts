import { supabase } from './supabaseClient';

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  email: string | null;
}

export const signInWithEmail = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return { success: false, message: error.message };
    }
    
    return { success: true, message: '登录成功' };
  } catch (error: any) {
    return { success: false, message: error.message || '登录失败' };
  }
};

export const signUpWithEmail = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      return { success: false, message: error.message };
    }
    
    return { success: true, message: '注册成功，请检查邮箱验证' };
  } catch (error: any) {
    return { success: false, message: error.message || '注册失败' };
  }
};

export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<AuthState> => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    isLoggedIn: !!session,
    userId: session?.user?.id || null,
    email: session?.user?.email || null,
  };
};

export const refreshSession = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('[Auth] 刷新会话失败:', error.message);
      return false;
    }
    console.log('[Auth] 会话刷新成功');
    return true;
  } catch (error: any) {
    console.error('[Auth] 刷新会话异常:', error.message);
    return false;
  }
};

export const onAuthStateChange = (callback: (state: AuthState) => void): (() => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback({
      isLoggedIn: !!session,
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
    });
  });
};