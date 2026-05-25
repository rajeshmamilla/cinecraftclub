package com.c3.backend.repository;

import com.c3.backend.model.MovieRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MovieRatingRepository extends JpaRepository<MovieRating, Integer> {

    Optional<MovieRating> findByUserIdAndMovieId(Long userId, Long movieId);

    @Query("SELECT r FROM MovieRating r WHERE r.user.id = :userId ORDER BY r.updatedAt DESC")
    List<MovieRating> findByUserIdOrderByUpdatedAtDesc(@Param("userId") Long userId);

    @Query("SELECT r FROM MovieRating r JOIN FETCH r.user WHERE r.movieId = :movieId ORDER BY r.updatedAt DESC")
    List<MovieRating> findByMovieIdOrderByUpdatedAtDesc(@Param("movieId") Long movieId);

    @Query("SELECT AVG(r.rating), COUNT(r) FROM MovieRating r WHERE r.movieId = :movieId")
    List<Object[]> getAverageRatingByMovieId(@Param("movieId") Long movieId);

    @Query("SELECT r.movieId, AVG(r.rating), COUNT(r) FROM MovieRating r WHERE r.movieId IN :movieIds GROUP BY r.movieId")
    List<Object[]> getAverageRatingsForMovies(@Param("movieIds") List<Long> movieIds);
}

