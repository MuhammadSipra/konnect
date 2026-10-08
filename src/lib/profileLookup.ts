import { supabase } from './supabase';

// "_" and "%" are wildcards in ilike, so escape them for an exact (case-insensitive) match.
const escapeLike = (v: string) => v.replace(/[\\%_]/g, (m) => '\\' + m);

export async function findProfileByEmail(email: string): Promise<any | null> {
  const clean = (email || '').trim();
  if (!clean) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', escapeLike(clean))
    .order('id', { ascending: true })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function findProfileByPhone(phone: string): Promise<any | null> {
  const clean = (phone || '').trim();
  if (!clean) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', clean)
    .order('id', { ascending: true })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export function roleMismatchMessage(existingRole: string, kind: 'phone' | 'email'): string {
  const what = kind === 'phone' ? 'mobile number' : 'email';
  const label = existingRole === 'contractor' ? 'a Contractor' : 'a Client';
  const button = existingRole === 'contractor' ? "I'm a Contractor" : 'I Need Work Done';
  return `This ${what} is already registered as ${label}. Please go back and choose "${button}" to log in. To use Domexa in the other role, sign up with a different ${what}.`;
}