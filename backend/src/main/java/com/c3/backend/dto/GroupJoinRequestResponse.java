package com.c3.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Builder
public class GroupJoinRequestResponse {
    private Integer id;
    private Integer groupId;
    private String groupName;
    private String movieTitle;
    private Long userId;
    private String username;
    private String status;
    private ZonedDateTime createdAt;
}
