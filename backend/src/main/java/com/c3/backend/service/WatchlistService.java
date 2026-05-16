package com.c3.backend.service;

import com.c3.backend.dto.WatchlistRequest;
import com.c3.backend.model.User;
import com.c3.backend.model.WatchlistItem;
import com.c3.backend.repository.UserRepository;
import com.c3.backend.repository.WatchlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;

    public List<WatchlistItem> getUserWatchlist(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return watchlistRepository.findByUserIdOrderByAddedAtDesc(user.getId());
    }

    public WatchlistItem addToWatchlist(String username, WatchlistRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (watchlistRepository.existsByUserIdAndMovieId(user.getId(), request.getMovieId())) {
            throw new RuntimeException("Movie already in watchlist");
        }

        WatchlistItem item = WatchlistItem.builder()
                .user(user)
                .movieId(request.getMovieId())
                .mediaType(request.getMediaType())
                .title(request.getTitle())
                .posterPath(request.getPosterPath())
                .overview(request.getOverview())
                .voteAverage(request.getVoteAverage())
                .releaseDate(request.getReleaseDate())
                .build();

        return watchlistRepository.save(item);
    }

    public void removeFromWatchlist(String username, Integer movieId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        WatchlistItem item = watchlistRepository.findByUserIdAndMovieId(user.getId(), movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found in watchlist"));

        watchlistRepository.delete(item);
    }

    public WatchlistItem toggleWatchedStatus(String username, Integer movieId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        WatchlistItem item = watchlistRepository.findByUserIdAndMovieId(user.getId(), movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found in watchlist"));

        item.setWatched(item.getWatched() == null ? true : !item.getWatched());
        return watchlistRepository.save(item);
    }

    public boolean isMovieInWatchlist(String username, Integer movieId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return watchlistRepository.existsByUserIdAndMovieId(user.getId(), movieId);
    }
}
