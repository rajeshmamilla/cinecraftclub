package com.c3.backend.controller;

import com.c3.backend.dto.WatchlistRequest;
import com.c3.backend.model.WatchlistItem;
import com.c3.backend.service.WatchlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistService watchlistService;

    @GetMapping
    public ResponseEntity<List<WatchlistItem>> getWatchlist(Authentication authentication) {
        return ResponseEntity.ok(watchlistService.getUserWatchlist(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<WatchlistItem> addToWatchlist(
            Authentication authentication, 
            @RequestBody WatchlistRequest request) {
        return ResponseEntity.ok(watchlistService.addToWatchlist(authentication.getName(), request));
    }

    @DeleteMapping("/{movieId}")
    public ResponseEntity<?> removeFromWatchlist(
            Authentication authentication, 
            @PathVariable Integer movieId) {
        watchlistService.removeFromWatchlist(authentication.getName(), movieId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{movieId}/watched")
    public ResponseEntity<WatchlistItem> toggleWatchedStatus(
            Authentication authentication, 
            @PathVariable Integer movieId) {
        return ResponseEntity.ok(watchlistService.toggleWatchedStatus(authentication.getName(), movieId));
    }

    @GetMapping("/check/{movieId}")
    public ResponseEntity<Boolean> checkWatchlist(
            Authentication authentication, 
            @PathVariable Integer movieId) {
        return ResponseEntity.ok(watchlistService.isMovieInWatchlist(authentication.getName(), movieId));
    }
}
