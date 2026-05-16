package com.c3.backend.dto;

import lombok.Data;

@Data
public class GroupRequest {
    private String name;
    private Integer movieId;
    private String movieTitle;
    private String moviePoster;
    private String focus;
    private String keywords;
    private String description;
    private Boolean isPrivate;
}
