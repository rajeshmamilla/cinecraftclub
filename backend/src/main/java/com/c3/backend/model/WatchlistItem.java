package com.c3.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

@Entity
@Table(name = "watchlist")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WatchlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "movie_id", nullable = false)
    private Integer movieId;

    @Column(name = "media_type", length = 20)
    private String mediaType;

    @Column(length = 255)
    private String title;

    @Column(name = "poster_path", length = 255)
    private String posterPath;

    @Column(columnDefinition = "TEXT")
    private String overview;

    @Column(name = "vote_average")
    private Double voteAverage;

    @Column(name = "release_date", length = 50)
    private String releaseDate;

    @Column(name = "watched")
    @Builder.Default
    private Boolean watched = false;

    @CreationTimestamp
    @Column(name = "added_at", updatable = false)
    private ZonedDateTime addedAt;
}
