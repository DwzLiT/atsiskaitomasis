// Supabase / database errors come back in English. Map the ones users can
// actually see to Lithuanian; anything unknown gets a generic message.
const RULES = [
  [/insufficient cash: need ([\d.]+), have ([\d.]+)/i, (m) => `Nepakanka pinigų: reikia $${m[1]}, turite $${m[2]}.`],
  [/insufficient shares: have (\d+), want to sell (\d+)/i, (m) => `Nepakanka akcijų: turite ${m[1]}, norite parduoti ${m[2]}.`],
  [/unknown symbol (\S+)/i, (m) => `Nežinomas simbolis ${m[1]}. Pirmiausia suraskite akciją paieškoje.`],
  [/not logged in/i, () => 'Prisijunkite, kad galėtumėte tęsti.'],
  [/quantity must be a positive integer/i, () => 'Kiekis turi būti teigiamas sveikasis skaičius.'],
  [/price must be positive/i, () => 'Kaina turi būti teigiama.'],
  [/invalid login credentials/i, () => 'Neteisingas el. paštas arba slaptažodis.'],
  [/email not confirmed/i, () => 'Pirmiausia patvirtinkite el. paštą. Nuorodą rasite savo pašto dėžutėje.'],
  [/user already registered/i, () => 'Toks vartotojas jau užregistruotas.'],
  [/password should be at least (\d+)/i, (m) => `Slaptažodis turi būti bent ${m[1]} simbolių.`],
  [/unable to validate email|invalid email|email address .* is invalid/i, () => 'Neteisingas el. pašto adresas.'],
  [/rate limit|too many requests/i, () => 'Per daug bandymų. Palaukite ir bandykite dar kartą.'],
  [/failed to fetch|network/i, () => 'Nepavyko prisijungti prie serverio. Patikrinkite interneto ryšį.'],
]

export function toLithuanianError(message) {
  const text = String(message ?? '')
  for (const [pattern, translate] of RULES) {
    const match = text.match(pattern)
    if (match) return translate(match)
  }
  return 'Įvyko klaida. Bandykite dar kartą.'
}
