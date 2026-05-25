package com.c3.backend.service;

import com.c3.backend.dto.RatingRequest;
import com.c3.backend.dto.RatingResponse;
import com.c3.backend.dto.MovieAverageRatingResponse;
import com.c3.backend.model.MovieRating;
import com.c3.backend.model.User;
import com.c3.backend.repository.MovieRatingRepository;
import com.c3.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.util.Collections;
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
                .username(r.getUser() != null ? r.getUser().getUsername() : null)
                .userFullName(r.getUser() != null ? r.getUser().getFullName() : null)
                .userProfilePicUrl(r.getUser() != null ? r.getUser().getProfilePicUrl() : null)
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

    @Transactional(readOnly = true)
    public List<RatingResponse> getMovieRatings(Long movieId) {
        return ratingRepository.findByMovieIdOrderByUpdatedAtDesc(movieId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MovieAverageRatingResponse getMovieAverageRating(Long movieId) {
        List<Object[]> results = ratingRepository.getAverageRatingByMovieId(movieId);
        if (results == null || results.isEmpty()) {
            return new MovieAverageRatingResponse(0.0, 0L);
        }
        Object[] row = results.get(0);
        Double average = row[0] != null ? ((Number) row[0]).doubleValue() : 0.0;
        Long count = row[1] != null ? ((Number) row[1]).longValue() : 0L;
        return new MovieAverageRatingResponse(average, count);
    }

    @Transactional(readOnly = true)
    public Map<Long, MovieAverageRatingResponse> getAverageRatings(List<Long> movieIds) {
        if (movieIds == null || movieIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Object[]> results = ratingRepository.getAverageRatingsForMovies(movieIds);
        Map<Long, MovieAverageRatingResponse> resultMap = new HashMap<>();
        for (Object[] row : results) {
            Long movieId = (Long) row[0];
            Double average = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
            Long count = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            resultMap.put(movieId, new MovieAverageRatingResponse(average, count));
        }
        return resultMap;
    }
}
