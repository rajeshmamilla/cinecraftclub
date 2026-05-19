package com.c3.backend.controller;

import com.c3.backend.dto.GroupMessageResponse;
import com.c3.backend.dto.GroupRequest;
import com.c3.backend.dto.GroupResponse;
import com.c3.backend.dto.MessageRequest;
import com.c3.backend.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(
            Authentication authentication,
            @RequestBody GroupRequest request) {
        return ResponseEntity.ok(groupService.createGroup(authentication.getName(), request));
    }

    @GetMapping
    public ResponseEntity<List<GroupResponse>> getUserGroups(Authentication authentication) {
        return ResponseEntity.ok(groupService.getUserGroups(authentication.getName()));
    }

    /** Resolves the real username from authentication, or null for anonymous/unauthenticated requests. */
    private String resolveUsername(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return authentication.getName();
    }

    /** Public endpoint — browse all public groups */
    @GetMapping("/public")
    public ResponseEntity<List<GroupResponse>> getAllPublicGroups(Authentication authentication) {
        return ResponseEntity.ok(groupService.getAllPublicGroups(resolveUsername(authentication)));
    }

    /** Public endpoint — fetch all public groups for a movie. Optionally enriches with isMember if logged in. */
    @GetMapping("/movie/{movieId}")
    public ResponseEntity<List<GroupResponse>> getGroupsForMovie(
            @PathVariable Integer movieId,
            Authentication authentication) {
        return ResponseEntity.ok(groupService.getGroupsForMovie(movieId, resolveUsername(authentication)));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupResponse> getGroupDetails(
            @PathVariable Integer groupId,
            Authentication authentication) {
        return ResponseEntity.ok(groupService.getGroupDetails(groupId, resolveUsername(authentication)));
    }

    @PostMapping("/{groupId}/join")
    public ResponseEntity<GroupResponse> joinGroup(
            Authentication authentication,
            @PathVariable Integer groupId) {
        return ResponseEntity.ok(groupService.joinGroup(authentication.getName(), groupId));
    }

    @DeleteMapping("/{groupId}/leave")
    public ResponseEntity<?> leaveGroup(
            Authentication authentication,
            @PathVariable Integer groupId) {
        groupService.leaveGroup(authentication.getName(), groupId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{groupId}/messages")
    public ResponseEntity<List<GroupMessageResponse>> getMessages(
            Authentication authentication,
            @PathVariable Integer groupId) {
        return ResponseEntity.ok(groupService.getGroupMessages(authentication.getName(), groupId));
    }

    @PostMapping("/{groupId}/messages")
    public ResponseEntity<GroupMessageResponse> sendMessage(
            Authentication authentication,
            @PathVariable Integer groupId,
            @RequestBody MessageRequest request) {
        return ResponseEntity.ok(groupService.sendMessage(authentication.getName(), groupId, request.getContent()));
    }
}
