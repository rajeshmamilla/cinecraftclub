package com.c3.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.ZonedDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupDetailsResponse {
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
    
    private List<KeywordCountResponse> trendingKeywords;
    private List<MemberResponse> members;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KeywordCountResponse {
        private String keyword;
        private Integer count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberResponse {
        private String username;
        private String fullName;
        private String profilePicUrl;
    }
}
