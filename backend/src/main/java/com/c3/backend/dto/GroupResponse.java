package com.c3.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.ZonedDateTime;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
public class GroupResponse {
    private String id;
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
    @JsonProperty("isMember")
    private boolean isMember;
    private String joinRequestStatus;
}
