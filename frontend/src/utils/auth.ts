export function getValidToken(): string | null {
  const token = localStorage.getItem('jwtToken');
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      localStorage.removeItem('jwtToken');
      return null;
    }
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('jwtToken');
      // Dispatch storage/auth change event to notify components
      window.dispatchEvent(new Event('storage'));
      return null;
    }
    return token;
  } catch (e) {
    localStorage.removeItem('jwtToken');
    window.dispatchEvent(new Event('storage'));
    return null;
  }
}
