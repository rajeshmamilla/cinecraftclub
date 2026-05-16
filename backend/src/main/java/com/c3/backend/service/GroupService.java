package com.c3.backend.service;

import com.c3.backend.dto.GroupMessageResponse;
import com.c3.backend.dto.GroupRequest;
import com.c3.backend.dto.GroupResponse;
import com.c3.backend.model.GroupMessage;
import com.c3.backend.model.MovieGroup;
import com.c3.backend.model.User;
import com.c3.backend.repository.GroupMessageRepository;
import com.c3.backend.repository.MovieGroupRepository;
import com.c3.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final MovieGroupRepository groupRepository;
    private final GroupMessageRepository messageRepository;
    private final UserRepository userRepository;

    // --- Helper to convert MovieGroup -> GroupResponse ---
    private GroupResponse toResponse(MovieGroup group, String currentUsername) {
        boolean isMember = currentUsername != null && group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equals(currentUsername));
        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .movieId(group.getMovieId())
                .movieTitle(group.getMovieTitle())
                .moviePoster(group.getMoviePoster())
                .focus(group.getFocus())
                .keywords(group.getKeywords())
                .description(group.getDescription())
                .isPrivate(group.getIsPrivate())
                .createdBy(group.getCreatedBy().getUsername())
                .createdAt(group.getCreatedAt())
                .memberCount(group.getMembers().size())
                .isMember(isMember)
                .build();
    }

    @Transactional
    public GroupResponse createGroup(String username, GroupRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        MovieGroup group = MovieGroup.builder()
                .name(request.getName())
                .movieId(request.getMovieId())
                .movieTitle(request.getMovieTitle())
                .moviePoster(request.getMoviePoster())
                .focus(request.getFocus())
                .keywords(request.getKeywords())
                .description(request.getDescription())
                .isPrivate(request.getIsPrivate() != null ? request.getIsPrivate() : false)
                .createdBy(user)
                .build();

        group.getMembers().add(user);
        MovieGroup saved = groupRepository.save(group);
        return toResponse(saved, username);
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> getUserGroups(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return groupRepository.findByMembersId(user.getId()).stream()
                .map(g -> toResponse(g, username))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GroupResponse getGroupDetails(Integer groupId, String currentUsername) {
        MovieGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        return toResponse(group, currentUsername);
    }

    // Internal helper for service use
    private MovieGroup getGroupEntity(Integer groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
    }

    /** Fetch all public groups for a movie. No auth required. */
    @Transactional(readOnly = true)
    public List<GroupResponse> getGroupsForMovie(Integer movieId, String currentUsername) {
        return groupRepository.findByMovieIdAndIsPrivateFalseOrderByCreatedAtDesc(movieId).stream()
                .map(g -> toResponse(g, currentUsername))
                .collect(Collectors.toList());
    }

    /** Fetch ALL public groups across all movies. */
    @Transactional(readOnly = true)
    public List<GroupResponse> getAllPublicGroups(String currentUsername) {
        return groupRepository.findAllByIsPrivateFalseOrderByCreatedAtDesc().stream()
                .map(g -> toResponse(g, currentUsername))
                .collect(Collectors.toList());
    }

    @Transactional
    public GroupResponse joinGroup(String username, Integer groupId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieGroup group = getGroupEntity(groupId);
        group.getMembers().add(user);
        MovieGroup saved = groupRepository.save(group);
        return toResponse(saved, username);
    }

    @Transactional
    public void leaveGroup(String username, Integer groupId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieGroup group = getGroupEntity(groupId);
        group.getMembers().remove(user);
        groupRepository.save(group);
    }

    @Transactional
    public GroupMessageResponse sendMessage(String username, Integer groupId, String content) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieGroup group = getGroupEntity(groupId);

        if (!group.getMembers().contains(user)) {
            throw new RuntimeException("User is not a member of this group");
        }

        GroupMessage message = GroupMessage.builder()
                .group(group)
                .user(user)
                .content(content)
                .build();

        message = messageRepository.save(message);

        return GroupMessageResponse.builder()
                .id(message.getId())
                .groupId(group.getId())
                .username(user.getUsername())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<GroupMessageResponse> getGroupMessages(String username, Integer groupId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieGroup group = getGroupEntity(groupId);

        if (group.getIsPrivate() && !group.getMembers().contains(user)) {
            throw new RuntimeException("Cannot view messages of a private group you are not in");
        }

        List<GroupMessage> messages = messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId);
        return messages.stream().map(m -> GroupMessageResponse.builder()
                .id(m.getId())
                .groupId(m.getGroup().getId())
                .username(m.getUser().getUsername())
                .content(m.getContent())
                .createdAt(m.getCreatedAt())
                .build()
        ).collect(Collectors.toList());
    }
}
