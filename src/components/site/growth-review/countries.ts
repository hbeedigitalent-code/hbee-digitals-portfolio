/**
 * Country list for the Growth Review (Phase 16.4). Local and static — no API.
 *
 * Based on ISO 3166-1 (all 249 entries), in common English short names, sorted
 * alphabetically. No country is pinned: search makes every one immediately
 * findable. The chosen name is stored as-is in the existing `country` field.
 *
 * ALIASES are alternative names people type ("Ivory Coast", "UK"). They only
 * help search; the stored value is always the canonical name.
 */

export const COUNTRIES: string[] = [
  'Afghanistan', 'Åland Islands', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antarctica',
  'Antigua and Barbuda', 'Argentina', 'Armenia', 'Aruba', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia',
  'Bonaire, Sint Eustatius and Saba', 'Bosnia and Herzegovina', 'Botswana', 'Bouvet Island', 'Brazil',
  'British Indian Ocean Territory', 'British Virgin Islands', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde',
  'Cambodia', 'Cameroon', 'Canada', 'Cayman Islands', 'Central African Republic', 'Chad', 'Chile', 'China',
  'Christmas Island', 'Cocos (Keeling) Islands', 'Colombia', 'Comoros', 'Congo', 'Cook Islands', 'Costa Rica',
  "Côte d'Ivoire", 'Croatia', 'Cuba', 'Curaçao', 'Cyprus', 'Czechia', 'Democratic Republic of the Congo', 'Denmark',
  'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
  'Estonia', 'Eswatini', 'Ethiopia', 'Falkland Islands', 'Faroe Islands', 'Fiji', 'Finland', 'France', 'French Guiana',
  'French Polynesia', 'French Southern Territories', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Gibraltar',
  'Greece', 'Greenland', 'Grenada', 'Guadeloupe', 'Guam', 'Guatemala', 'Guernsey', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Heard Island and McDonald Islands', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Isle of Man', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jersey', 'Jordan', 'Kazakhstan',
  'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macao', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Martinique', 'Mauritania', 'Mauritius', 'Mayotte', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Montserrat', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands',
  'New Caledonia', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'Norfolk Island', 'North Korea',
  'North Macedonia', 'Northern Mariana Islands', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Pitcairn Islands', 'Poland', 'Portugal', 'Puerto Rico',
  'Qatar', 'Réunion', 'Romania', 'Russia', 'Rwanda', 'Saint Barthélemy', 'Saint Helena, Ascension and Tristan da Cunha',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Martin', 'Saint Pierre and Miquelon', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone',
  'Singapore', 'Sint Maarten', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
  'South Georgia and the South Sandwich Islands', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname',
  'Svalbard and Jan Mayen', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand',
  'Timor-Leste', 'Togo', 'Tokelau', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Türkiye', 'Turkmenistan',
  'Turks and Caicos Islands', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'United States Minor Outlying Islands', 'Uruguay', 'US Virgin Islands', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Wallis and Futuna', 'Western Sahara', 'Yemen', 'Zambia', 'Zimbabwe',
]

/** Alternative names → canonical country. Search only; never stored. */
export const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'United Kingdom',
  'great britain': 'United Kingdom',
  britain: 'United Kingdom',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  'northern ireland': 'United Kingdom',
  usa: 'United States',
  us: 'United States',
  america: 'United States',
  'united states of america': 'United States',
  uae: 'United Arab Emirates',
  emirates: 'United Arab Emirates',
  'ivory coast': "Côte d'Ivoire",
  swaziland: 'Eswatini',
  'cape verde': 'Cabo Verde',
  burma: 'Myanmar',
  holland: 'Netherlands',
  'czech republic': 'Czechia',
  turkey: 'Türkiye',
  drc: 'Democratic Republic of the Congo',
  'dr congo': 'Democratic Republic of the Congo',
  'congo kinshasa': 'Democratic Republic of the Congo',
  'congo brazzaville': 'Congo',
  'republic of the congo': 'Congo',
  'east timor': 'Timor-Leste',
  macedonia: 'North Macedonia',
  'south korea': 'South Korea',
  korea: 'South Korea',
  'vatican': 'Vatican City',
  'holy see': 'Vatican City',
  'st kitts': 'Saint Kitts and Nevis',
  'st lucia': 'Saint Lucia',
  'st vincent': 'Saint Vincent and the Grenadines',
}

/** Lower-case, accents removed, punctuation folded to spaces. */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const FOLDED = COUNTRIES.map((name) => ({ name, folded: foldText(name) }))
const ALIAS_FOLDED = Object.entries(COUNTRY_ALIASES).map(([alias, name]) => ({ alias: foldText(alias), name }))

/**
 * Countries matching a query, best first: names that START with the query,
 * then names where any word starts with it, then alias matches — each group
 * alphabetical. Accent- and case-insensitive.
 */
export function searchCountries(query: string): string[] {
  const q = foldText(query)
  if (!q) return COUNTRIES
  const starts: string[] = []
  const words: string[] = []
  for (const { name, folded } of FOLDED) {
    if (folded.startsWith(q)) starts.push(name)
    else if (folded.split(' ').some((w, i, all) => all.slice(i).join(' ').startsWith(q))) words.push(name)
  }
  const seen = new Set([...starts, ...words])
  const aliases: string[] = []
  for (const { alias, name } of ALIAS_FOLDED) {
    if (alias.startsWith(q) && !seen.has(name)) {
      seen.add(name)
      aliases.push(name)
    }
  }
  return [...starts, ...words, ...aliases.sort((a, b) => a.localeCompare(b))]
}

/** The canonical country for an exact (folded) name or alias match, else null. */
export function exactCountry(query: string): string | null {
  const q = foldText(query)
  if (!q) return null
  return FOLDED.find((c) => c.folded === q)?.name ?? ALIAS_FOLDED.find((a) => a.alias === q)?.name ?? null
}

export function isCountry(value: string): boolean {
  return COUNTRIES.includes(value)
}
