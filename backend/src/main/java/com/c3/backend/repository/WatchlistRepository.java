package com.c3.backend.repository;

import com.c3.backend.model.WatchlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WatchlistRepository extends JpaRepository<WatchlistItem, Integer> {
    List<WatchlistItem> findByUserIdOrderByAddedAtDesc(Long userId);
    Optional<WatchlistItem> findByUserIdAndMovieId(Long userId, Integer movieId);
    boolean existsByUserIdAndMovieId(Long userId, Integer movieId);
}
