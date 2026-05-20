package com.c3.backend.dto;

import lombok.Data;

@Data
public class RatingRequest {
    private Long movieId;
    private String mediaType;
    private String movieTitle;
    private String posterPath;
    private Integer rating;
    private String review;
}
