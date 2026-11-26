/*
 * Génère l'empreinte d'un mot de passe administrateur, à coller dans la variable Netlify ADMIN_PASSWORD_HASH.
 * Le mot de passe lui-même n'est jamais enregistré nulle part.
 * Utilisation : npm run hash-password            (saisie masquée)
 */
import { hashPassword } from '../netlify/functions/_lib/auth.mjs';
import readline from 'node:readline';

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write('*'); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const pwd = process.argv[2] && process.argv[2] !== '--' ? process.argv[2] : await ask('Mot de passe administrateur : ');
if (!pwd || pwd.length < 12) { console.error('Choisissez un mot de passe d\'au moins 12 caractères.'); process.exit(1); }
const confirm = process.argv[2] ? pwd : await ask('Confirmez le mot de passe : ');
if (confirm !== pwd) { console.error('Les deux saisies ne correspondent pas.'); process.exit(1); }
console.log('\nValeur à coller dans ADMIN_PASSWORD_HASH :\n\n' + await hashPassword(pwd) + '\n');
