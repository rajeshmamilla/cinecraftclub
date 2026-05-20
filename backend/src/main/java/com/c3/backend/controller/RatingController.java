package com.c3.backend.controller;

import com.c3.backend.dto.RatingRequest;
import com.c3.backend.dto.RatingResponse;
import com.c3.backend.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    /** Submit or update a rating */
    @PostMapping
    public ResponseEntity<RatingResponse> saveRating(
            Authentication authentication,
            @RequestBody RatingRequest request) {
        return ResponseEntity.ok(ratingService.saveRating(authentication.getName(), request));
    }

    /** Get all ratings for the authenticated user */
    @GetMapping
    public ResponseEntity<List<RatingResponse>> getUserRatings(Authentication authentication) {
        return ResponseEntity.ok(ratingService.getUserRatings(authentication.getName()));
    }

    /** Get the user's rating for a specific movie */
    @GetMapping("/movie/{movieId}")
    public ResponseEntity<RatingResponse> getMovieRating(
            Authentication authentication,
            @PathVariable Long movieId) {
        return ratingService.getMovieRating(authentication.getName(), movieId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /** Delete a rating */
    @DeleteMapping("/movie/{movieId}")
    public ResponseEntity<Void> deleteRating(
            Authentication authentication,
            @PathVariable Long movieId) {
        ratingService.deleteRating(authentication.getName(), movieId);
        return ResponseEntity.ok().build();
    }
}
