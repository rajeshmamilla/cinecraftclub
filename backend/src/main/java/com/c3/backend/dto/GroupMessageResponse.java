package com.c3.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class GroupMessageResponse {
    private Integer id;
    private String groupId;
    private String username;
    private String content;
    private ZonedDateTime createdAt;
    private Map<String, List<String>> reactions;
}
