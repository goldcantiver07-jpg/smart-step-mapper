export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isPasswordValid(password: string): boolean {
  return password.length >= 6;
}

export function isDisplayNameValid(name: string): boolean {
  return name.trim().length >= 1 && name.trim().length <= 100;
}
