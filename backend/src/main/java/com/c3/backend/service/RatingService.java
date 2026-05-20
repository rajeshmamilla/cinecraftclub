package com.c3.backend.service;

import com.c3.backend.dto.RatingRequest;
import com.c3.backend.dto.RatingResponse;
import com.c3.backend.model.MovieRating;
import com.c3.backend.model.User;
import com.c3.backend.repository.MovieRatingRepository;
import com.c3.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final MovieRatingRepository ratingRepository;
    private final UserRepository userRepository;

    private RatingResponse toResponse(MovieRating r) {
        return RatingResponse.builder()
                .id(r.getId())
                .movieId(r.getMovieId())
                .mediaType(r.getMediaType())
                .movieTitle(r.getMovieTitle())
                .posterPath(r.getPosterPath())
                .rating(r.getRating())
                .review(r.getReview())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    @Transactional
    public RatingResponse saveRating(String username, RatingRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 10) {
            throw new RuntimeException("Rating must be between 1 and 10");
        }

        MovieRating rating = ratingRepository.findByUserIdAndMovieId(user.getId(), request.getMovieId())
                .orElseGet(() -> MovieRating.builder()
                        .user(user)
                        .movieId(request.getMovieId())
                        .build());

        rating.setMediaType(request.getMediaType() != null ? request.getMediaType() : "movie");
        rating.setMovieTitle(request.getMovieTitle());
        rating.setPosterPath(request.getPosterPath());
        rating.setRating(request.getRating());
        rating.setReview(request.getReview());

        return toResponse(ratingRepository.save(rating));
    }

    @Transactional(readOnly = true)
    public List<RatingResponse> getUserRatings(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ratingRepository.findByUserIdOrderByUpdatedAtDesc(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<RatingResponse> getMovieRating(String username, Long movieId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ratingRepository.findByUserIdAndMovieId(user.getId(), movieId)
                .map(this::toResponse);
    }

    @Transactional
    public void deleteRating(String username, Long movieId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ratingRepository.findByUserIdAndMovieId(user.getId(), movieId)
                .ifPresent(ratingRepository::delete);
    }
}
