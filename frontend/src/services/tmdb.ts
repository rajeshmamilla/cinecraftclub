import axios from 'axios';

const API_KEY = "83d917b7427eb6499e407493917ae3db";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
  },
});

export interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv';
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Crew {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
}

export interface MovieDetails extends Movie {
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  status: string;
  tagline: string;
  imdb_id?: string;
  external_ids?: {
    imdb_id?: string;
    [key: string]: any;
  };
  credits: {
    cast: Cast[];
    crew: Crew[];
  };
}

export const getTrendingMovies = async (page: number = 1): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get('/trending/movie/week', {
      params: { page }
    });
    return response.data.results;
  } catch (error) {
    console.error("Error fetching trending movies:", error);
    return [];
  }
};

export const getPopularMoviesByLanguage = async (lang: string, page: number = 1): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get('/discover/movie', {
      params: {
        with_original_language: lang,
        sort_by: 'popularity.desc',
        'vote_count.gte': 10,
        page
      }
    });
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching ${lang} movies:`, error);
    return [];
  }
};

export const getPopularTeluguMovies = async (page: number = 1): Promise<Movie[]> => {
  return getPopularMoviesByLanguage('te', page);
};

export const getMediaDetails = async (id: string, type: 'movie' | 'tv' = 'movie'): Promise<MovieDetails | null> => {
  try {
    const response = await tmdbApi.get(`/${type}/${id}`, {
      params: {
        append_to_response: 'credits,external_ids',
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching details for ${type} ${id}:`, error);
    return null;
  }
};

export const searchMulti = async (query: string): Promise<Movie[]> => {
  if (!query) return [];
  try {
    const response = await tmdbApi.get('/search/multi', {
      params: {
        query,
        include_adult: false,
      }
    });
    return response.data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (error) {
    console.error("Error searching:", error);
    return [];
  }
};

export const getImageUrl = (path: string | null, size: 'w500' | 'w185' | 'original' = 'w500') => {
  if (!path) return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3E%3Crect width='500' height='750' fill='%231a1a2e'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23555' font-family='sans-serif' font-size='24'%3ENo Image%3C/text%3E%3C/svg%3E`;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const getTopRatedMovies = async (page: number = 1): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get('/movie/top_rated', { params: { page } });
    return response.data.results;
  } catch (error) { return []; }
};

export const getNowPlayingMovies = async (page: number = 1): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get('/movie/now_playing', { params: { page } });
    return response.data.results;
  } catch (error) { return []; }
};

export const getUpcomingMovies = async (page: number = 1): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get('/movie/upcoming', { params: { page } });
    return response.data.results;
  } catch (error) { return []; }
};

export const discoverByGenre = async (genreId: number, page: number = 1): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get('/discover/movie', {
      params: { with_genres: genreId, sort_by: 'popularity.desc', page }
    });
    return response.data.results;
  } catch (error) { return []; }
};

export const getGenreList = async (): Promise<{ id: number; name: string }[]> => {
  try {
    const response = await tmdbApi.get('/genre/movie/list');
    return response.data.genres;
  } catch (error) { return []; }
};

export const getRecommendations = async (id: string, type: 'movie' | 'tv' = 'movie', page: number = 1): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get(`/${type}/${id}/recommendations`, {
      params: { page }
    });
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching recommendations for ${type} ${id}:`, error);
    return [];
  }
};

export interface Review {
  id: string;
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
}

export const getMediaReviews = async (id: string, type: 'movie' | 'tv' = 'movie'): Promise<Review[]> => {
  try {
    const response = await tmdbApi.get(`/${type}/${id}/reviews`);
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching reviews for ${type} ${id}:`, error);
    return [];
  }
};


