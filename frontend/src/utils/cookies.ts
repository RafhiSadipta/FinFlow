// Cookie and Token Persistence Utilities for FinFlow

export const setCookie = (name: string, value: string, days = 30): void => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

export const getCookie = (name: string): string | null => {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

export const removeCookie = (name: string): void => {
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
};

export const getSavedToken = (): string | null => {
  return getCookie('finflow_token') || localStorage.getItem('finflow_token') || null;
};

export const saveToken = (token: string): void => {
  setCookie('finflow_token', token, 30);
  try {
    localStorage.setItem('finflow_token', token);
  } catch {
    // Ignore storage quota errors in private mode
  }
};

export const clearSavedToken = (): void => {
  removeCookie('finflow_token');
  try {
    localStorage.removeItem('finflow_token');
  } catch {
    // Ignore
  }
};
