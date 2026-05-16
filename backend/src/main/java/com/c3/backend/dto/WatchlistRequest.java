package com.c3.backend.dto;

import lombok.Data;

@Data
public class WatchlistRequest {
    private Integer movieId;
    private String mediaType;
    private String title;
    private String posterPath;
    private String overview;
    private Double voteAverage;
    private String releaseDate;
}
