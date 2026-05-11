export type MediaType = 'movie' | 'tv' | 'short_drama';

export interface TMDbMovieSummary {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
  media_type?: string;
}

export interface TMDbTvSummary {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  overview: string;
  media_type?: string;
}

export interface TMDbMovieDetail extends TMDbMovieSummary {
  genres: { id: number; name: string }[];
  runtime: number;
  tagline: string;
  credits?: {
    cast: TMDbCast[];
    crew: TMDbCrew[];
  };
}

export interface TMDbTvDetail {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  overview: string;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  tagline: string;
  credits?: {
    cast: TMDbCast[];
    crew: TMDbCrew[];
  };
}

export interface TMDbCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TMDbCrew {
  id: number;
  name: string;
  job: string;
}

export interface SavedMedia {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: string;
  addedAt: number;
  episodeNumber: string;
  characterName: string;
  identity: string;
  scene: string;
  appearanceTime: string;
  behavior: string;
  outfit: string;
  posture: string;
  grade: string;
  userReview: string;
  watchedDate: string;
  favorite: boolean;
  genres: string[];
  overview: string;
}

export type SortOption = 'date_added' | 'rating' | 'year' | 'title' | 'episode';

export interface CsvRow {
  title: string;
  episode: string;
  character: string;
  identity: string;
  scene: string;
  type: string;
  grade: string;
  appearanceTime: string;
  behavior: string;
  outfit: string;
  posture: string;
  tmdbUrl: string;
  review: string;
  date: string;
}

export interface ImportResult {
  row: CsvRow;
  status: 'matched' | 'skipped' | 'added';
  matchedTitle?: string;
  tmdbId?: number;
  mediaType?: MediaType;
  message?: string;
}