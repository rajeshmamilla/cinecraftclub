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

export const getPopularTeluguMovies = async (page: number = 1): Promise<Movie[]> => {
  try {
    const response = await tmdbApi.get('/discover/movie', {
      params: {
        with_original_language: 'te',
        sort_by: 'popularity.desc',
        page
      }
    });
    return response.data.results;
  } catch (error) {
    console.error("Error fetching Telugu movies:", error);
    return [];
  }
};

export const getMediaDetails = async (id: string, type: 'movie' | 'tv' = 'movie'): Promise<MovieDetails | null> => {
  try {
    const response = await tmdbApi.get(`/${type}/${id}`, {
      params: {
        append_to_response: 'credits',
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
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  return `${IMAGE_BASE_URL}/${size}${path}`;
};
