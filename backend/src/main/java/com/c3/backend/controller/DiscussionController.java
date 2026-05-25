package com.c3.backend.controller;

import com.c3.backend.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/discussions")
@RequiredArgsConstructor
public class DiscussionController {

    private final GroupService groupService;

    @PostMapping("/{discussionId}/reactions")
    public ResponseEntity<Void> toggleReaction(
            @PathVariable Integer discussionId,
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        String reactionType = request.get("reactionType");
        groupService.toggleReaction(authentication.getName(), discussionId, reactionType);
        return ResponseEntity.ok().build();
    }
}
