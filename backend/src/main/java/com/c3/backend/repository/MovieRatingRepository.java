package com.c3.backend.repository;

import com.c3.backend.model.MovieRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MovieRatingRepository extends JpaRepository<MovieRating, Long> {

    Optional<MovieRating> findByUserIdAndMovieId(Long userId, Long movieId);

    @Query("SELECT r FROM MovieRating r WHERE r.user.id = :userId ORDER BY r.updatedAt DESC")
    List<MovieRating> findByUserIdOrderByUpdatedAtDesc(@Param("userId") Long userId);
}
