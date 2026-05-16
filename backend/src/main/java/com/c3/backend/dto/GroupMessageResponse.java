package com.c3.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Builder
public class GroupMessageResponse {
    private Integer id;
    private Integer groupId;
    private String username;
    private String content;
    private ZonedDateTime createdAt;
}
