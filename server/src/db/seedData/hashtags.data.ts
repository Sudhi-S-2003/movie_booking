export interface SeedHashtag {
  name:        string;
  slug:        string;
  color:       string;
  description: string;
}

export const hashtagsSeedData: SeedHashtag[] = [
  { name: 'Cinema',          slug: 'cinema',          color: '#ef4444', description: 'Everything movies — reviews, ratings, behind-the-scenes.' },
  { name: 'Malayalam',       slug: 'malayalam',       color: '#10b981', description: 'Mollywood magic, from Kumbalangi to Manjummel.' },
  { name: 'Tamil',           slug: 'tamil',           color: '#f59e0b', description: 'Kollywood — where heroes become legends.' },
  { name: 'Bollywood',       slug: 'bollywood',       color: '#ec4899', description: 'Hindi cinema, songs, and star power.' },
  { name: 'IMAX',            slug: 'imax',            color: '#0ea5e9', description: 'The biggest, loudest, most immersive way to watch a movie.' },
  { name: 'Reviews',         slug: 'reviews',         color: '#8b5cf6', description: 'Honest takes from real moviegoers.' },
  { name: 'Upcoming',        slug: 'upcoming',        color: '#f97316', description: 'Trailers, posters, and release dates you should know.' },
  { name: 'Thriller',        slug: 'thriller',        color: '#64748b', description: 'Edge-of-your-seat storytelling.' },
  { name: 'Sci-Fi',          slug: 'sci-fi',          color: '#06b6d4', description: 'Worlds beyond imagination.' },
  { name: 'Action',          slug: 'action',          color: '#dc2626', description: 'Fights, chases, explosions.' },
  { name: 'Drama',           slug: 'drama',           color: '#a855f7', description: 'Stories that break and rebuild you.' },
  { name: 'Comedy',          slug: 'comedy',          color: '#eab308', description: 'Because laughter is the best ticket.' },
  { name: 'BehindTheScenes', slug: 'behindthescenes', color: '#14b8a6', description: 'How the magic really happens.' },
  { name: 'BoxOffice',       slug: 'boxoffice',       color: '#f43f5e', description: 'Numbers, trends, and records.' },
  { name: 'MovieNight',      slug: 'movienight',      color: '#6366f1', description: 'Because some nights just belong to the big screen.' },
];
