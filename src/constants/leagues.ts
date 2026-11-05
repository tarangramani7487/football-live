export type League = {
  slug: string;
  /** ESPN numeric league id (the `l:` part of an event uid). */
  id: string;
  name: string;
  short: string;
  country: string;
  logo: string;
};

const logo = (id: number) => `https://a.espncdn.com/i/leaguelogos/soccer/500/${id}.png`;

// ESPN league slugs. Order controls how sections appear on the Matches screen.
export const LEAGUES: League[] = [
  { slug: 'eng.1', id: '700', name: 'Premier League', short: 'EPL', country: 'England', logo: logo(23) },
  { slug: 'uefa.champions', id: '775', name: 'UEFA Champions League', short: 'UCL', country: 'Europe', logo: logo(2) },
  { slug: 'esp.1', id: '740', name: 'LALIGA', short: 'LaLiga', country: 'Spain', logo: logo(15) },
  { slug: 'ita.1', id: '730', name: 'Serie A', short: 'Serie A', country: 'Italy', logo: logo(12) },
  { slug: 'ger.1', id: '720', name: 'Bundesliga', short: 'Bundesliga', country: 'Germany', logo: logo(10) },
  { slug: 'fra.1', id: '710', name: 'Ligue 1', short: 'Ligue 1', country: 'France', logo: logo(9) },
  { slug: 'uefa.europa', id: '776', name: 'UEFA Europa League', short: 'UEL', country: 'Europe', logo: logo(2310) },
  { slug: 'uefa.europa.conf', id: '20296', name: 'UEFA Conference League', short: 'UECL', country: 'Europe', logo: logo(20296) },
  { slug: 'ind.1', id: '8316', name: 'Indian Super League', short: 'ISL', country: 'India', logo: logo(2334) },
  { slug: 'ksa.1', id: '21231', name: 'Saudi Pro League', short: 'SPL', country: 'Saudi Arabia', logo: logo(2488) },
  { slug: 'usa.1', id: '770', name: 'MLS', short: 'MLS', country: 'USA', logo: logo(19) },
  { slug: 'eng.2', id: '3914', name: 'EFL Championship', short: 'EFL', country: 'England', logo: logo(24) },
  { slug: 'ned.1', id: '725', name: 'Eredivisie', short: 'Eredivisie', country: 'Netherlands', logo: logo(11) },
  { slug: 'por.1', id: '715', name: 'Primeira Liga', short: 'Liga PT', country: 'Portugal', logo: logo(14) },
  { slug: 'bra.1', id: '630', name: 'Brazil Serie A', short: 'Brasileirão', country: 'Brazil', logo: logo(85) },
  { slug: 'mex.1', id: '760', name: 'Liga MX', short: 'Liga MX', country: 'Mexico', logo: logo(22) },
  { slug: 'eng.fa', id: '3918', name: 'FA Cup', short: 'FA Cup', country: 'England', logo: logo(40) },
  { slug: 'eng.league_cup', id: '3920', name: 'Carabao Cup', short: 'EFL Cup', country: 'England', logo: logo(41) },
];

// Leagues whose news is merged into the "All" news feed.
export const TOP_NEWS_LEAGUES = ['eng.1', 'uefa.champions', 'esp.1', 'ita.1', 'ger.1'];

export const getLeague = (slug: string) => LEAGUES.find((l) => l.slug === slug);
