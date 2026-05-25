package com.c3.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Builder
public class RatingResponse {
    private Integer id;
    private Long movieId;
    private String mediaType;
    private String movieTitle;
    private String posterPath;
    private Integer rating;
    private String review;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
    private String username;
    private String userFullName;
    private String userProfilePicUrl;
}
