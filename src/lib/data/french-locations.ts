/**
 * french-locations.ts — Référentiel des zones géographiques, départements et régions de France
 * Permet la sélection de zones larges (ex: "Bouches-du-Rhône (13)", "PACA", "Île-de-France")
 */

export const POPULAR_FRENCH_LOCATIONS: string[] = [
  // Télétravail & National
  'Télétravail (100% Remote / France entière)',
  'Télétravail partiel / Hybride',

  // Régions
  'Provence-Alpes-Côte d\'Azur (PACA)',
  'Île-de-France',
  'Auvergne-Rhône-Alpes',
  'Occitanie',
  'Nouvelle-Aquitaine',
  'Hauts-de-France',
  'Pays de la Loire',
  'Bretagne',
  'Grand Est',
  'Normandie',
  'Bourgogne-Franche-Comté',
  'Centre-Val de Loire',

  // Départements majeurs
  'Bouches-du-Rhône (13)',
  'Paris (75)',
  'Rhône (69)',
  'Gironde (33)',
  'Haute-Garonne (31)',
  'Nord (59)',
  'Loire-Atlantique (44)',
  'Hérault (34)',
  'Bas-Rhin (67)',
  'Alpes-Maritimes (06)',
  'Isère (38)',
  'Var (83)',
  'Finistère (29)',
  'Ille-et-Vilaine (35)',
  'Seine-Maritime (76)',
  'Hauts-de-Seine (92)',
  'Seine-Saint-Denis (93)',
  'Val-de-Marne (94)',
  'Yvelines (78)',
  'Essonne (91)',
  'Val-d\'Oise (95)',
  'Seine-et-Marne (77)',
  'Puy-de-Dôme (63)',
  'Gard (30)',
  'Vaucluse (84)',
  'Calvados (14)',
  'Pyrénées-Atlantiques (64)',
  'Moselle (57)',

  // Grandes Villes & Métropoles
  'Marseille (13)',
  'Aix-en-Provence (13)',
  'Paris et agglomération',
  'Lyon (69)',
  'Toulouse (31)',
  'Nice (06)',
  'Nantes (44)',
  'Montpellier (34)',
  'Strasbourg (67)',
  'Bordeaux (33)',
  'Lille (59)',
  'Rennes (35)',
  'Toulon (83)',
  'Grenoble (38)',
  'Rouen (76)',
  'Dijon (21)',
  'Angers (49)',
  'Nîmes (30)',
  'Clermont-Ferrand (63)',
];

export function searchLocationSuggestions(input: string, limit = 8): string[] {
  if (!input || input.trim().length < 1) return [];
  const query = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  return POPULAR_FRENCH_LOCATIONS.filter((loc) => {
    const locNorm = loc
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return locNorm.includes(query);
  }).slice(0, limit);
}
