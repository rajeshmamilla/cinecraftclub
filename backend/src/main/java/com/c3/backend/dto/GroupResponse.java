package com.c3.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Builder
public class GroupResponse {
    private Integer id;
    private String name;
    private Integer movieId;
    private String movieTitle;
    private String moviePoster;
    private String focus;
    private String keywords;
    private String description;
    private Boolean isPrivate;
    private String createdBy;
    private ZonedDateTime createdAt;
    private int memberCount;
    private boolean isMember;
}
