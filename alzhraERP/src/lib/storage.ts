/** Minimal shape of the user object stored in localStorage */
export interface StoredUser {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  company_id?: string;
  [key: string]: unknown;
}

export const storage = {
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },
  setToken: (token: string): void => {
    localStorage.setItem('auth_token', token);
  },
  removeToken: (): void => {
    localStorage.removeItem('auth_token');
  },
  setUser: (user: StoredUser): void => {
    localStorage.setItem('user_data', JSON.stringify(user));
  },
  getUser: (): StoredUser | null => {
    const user = localStorage.getItem('user_data');
    return user ? (JSON.parse(user) as StoredUser) : null;
  }
};