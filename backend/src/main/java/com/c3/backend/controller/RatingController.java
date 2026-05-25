package com.c3.backend.controller;

import com.c3.backend.dto.RatingRequest;
import com.c3.backend.dto.RatingResponse;
import com.c3.backend.dto.MovieAverageRatingResponse;
import com.c3.backend.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    /** Get all ratings and reviews for a movie (public) */
    @GetMapping("/movie/{movieId}/all")
    public ResponseEntity<List<RatingResponse>> getMovieRatings(@PathVariable Long movieId) {
        return ResponseEntity.ok(ratingService.getMovieRatings(movieId));
    }

    /** Get the average rating and count for a movie (public) */
    @GetMapping("/movie/{movieId}/average")
    public ResponseEntity<MovieAverageRatingResponse> getMovieAverageRating(@PathVariable Long movieId) {
        return ResponseEntity.ok(ratingService.getMovieAverageRating(movieId));
    }

    /** Get the average ratings for a list of movies (public) */
    @GetMapping("/movie/averages")
    public ResponseEntity<Map<Long, MovieAverageRatingResponse>> getAverageRatings(@RequestParam("ids") List<Long> ids) {
        return ResponseEntity.ok(ratingService.getAverageRatings(ids));
    }
}
