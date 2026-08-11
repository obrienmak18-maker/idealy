// Test de connexion Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhucjkyktdflwocrmzhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodWNqa3lrdGRmbHdvY3JtemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDYxNzgsImV4cCI6MjA5NzI4MjE3OH0.VHVvjAMnDwymsMeEgyLF2ve7v67EBnRiudfSouBX7-Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Test de connexion Supabase...');
  
  try {
    // Test simple: vérifier si on peut se connecter
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('Erreur de connexion:', error);
      return false;
    }
    
    console.log('✅ Connexion Supabase réussie !');
    console.log('Données reçues:', data);
    return true;
  } catch (e) {
    console.error('Erreur:', e);
    return false;
  }
}

testConnection();
