package com.c3.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "movie_groups")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovieGroup {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "movie_id", nullable = false)
    private Integer movieId;

    @Column(name = "movie_title")
    private String movieTitle;

    @Column(name = "movie_poster")
    private String moviePoster;

    private String focus;
    
    private String keywords;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "trending_keywords", columnDefinition = "jsonb")
    private String trendingKeywords;

    @Column(name = "keywords_updated_at")
    private ZonedDateTime keywordsUpdatedAt;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_private")
    @Builder.Default
    private Boolean isPrivate = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @ManyToMany
    @JoinTable(
        name = "group_members",
        joinColumns = @JoinColumn(name = "group_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private Set<User> members = new HashSet<>();
}
