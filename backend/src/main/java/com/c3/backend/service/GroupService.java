package com.c3.backend.service;

import com.c3.backend.dto.GroupJoinRequestResponse;
import com.c3.backend.dto.GroupMessageResponse;
import com.c3.backend.dto.GroupRequest;
import com.c3.backend.dto.GroupResponse;
import com.c3.backend.model.GroupJoinRequest;
import com.c3.backend.model.GroupMessage;
import com.c3.backend.model.MovieGroup;
import com.c3.backend.model.User;
import com.c3.backend.repository.GroupJoinRequestRepository;
import com.c3.backend.repository.GroupMessageRepository;
import com.c3.backend.repository.MovieGroupRepository;
import com.c3.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import com.c3.backend.dto.GroupDetailsResponse;
import com.c3.backend.model.MessageReaction;
import com.c3.backend.repository.MessageReactionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final MovieGroupRepository groupRepository;
    private final GroupMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final GroupJoinRequestRepository joinRequestRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final KeywordAnalyzer keywordAnalyzer;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // --- Helper to convert MovieGroup -> GroupResponse ---
    private GroupResponse toResponse(MovieGroup group, String currentUsername) {
        boolean isMember = currentUsername != null && group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equals(currentUsername));

        String joinRequestStatus = null;
        if (currentUsername != null && !isMember) {
            Optional<User> userOpt = userRepository.findByUsername(currentUsername);
            if (userOpt.isPresent()) {
                joinRequestStatus = joinRequestRepository.findByGroupIdAndUserId(group.getId(), userOpt.get().getId())
                        .map(GroupJoinRequest::getStatus)
                        .orElse(null);
            }
        }

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
                .joinRequestStatus(joinRequestStatus)
                .messageCount(messageRepository.countByGroupId(group.getId()))
                .build();
    }

    private static final String CHARACTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();

    private String generateUniqueGroupId() {
        String generatedId;
        do {
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 8; i++) {
                sb.append(CHARACTERS.charAt(RANDOM.nextInt(CHARACTERS.length())));
            }
            generatedId = sb.toString();
        } while (groupRepository.existsById(generatedId));
        return generatedId;
    }

    @Transactional
    public GroupResponse createGroup(String username, GroupRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        MovieGroup group = MovieGroup.builder()
                .id(generateUniqueGroupId())
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
    public GroupResponse getGroupDetails(String groupId, String currentUsername) {
        MovieGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        return toResponse(group, currentUsername);
    }

    // Internal helper for service use
    private MovieGroup getGroupEntity(String groupId) {
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
    public GroupResponse joinGroup(String username, String groupId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieGroup group = getGroupEntity(groupId);
        if (group.getIsPrivate()) {
            throw new RuntimeException("Cannot directly join a private group. Please request to join.");
        }
        group.getMembers().add(user);
        MovieGroup saved = groupRepository.save(group);
        return toResponse(saved, username);
    }

    @Transactional
    public void leaveGroup(String username, String groupId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieGroup group = getGroupEntity(groupId);
        group.getMembers().remove(user);
        groupRepository.save(group);
    }

    @Transactional
    public GroupMessageResponse sendMessage(String username, String groupId, String content) {
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
    public List<GroupMessageResponse> getGroupMessages(String username, String groupId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieGroup group = getGroupEntity(groupId);

        if (group.getIsPrivate() && !group.getMembers().contains(user)) {
            throw new RuntimeException("Cannot view messages of a private group you are not in");
        }

        List<GroupMessage> messages = messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId);

        // Fetch all reactions for this group
        List<MessageReaction> allReactions = messageReactionRepository.findByMessageGroupId(groupId);
        // Map: messageId -> reactionType -> List of usernames
        Map<Integer, Map<String, List<String>>> reactionsMap = allReactions.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getMessage().getId(),
                        Collectors.groupingBy(
                                MessageReaction::getReactionType,
                                Collectors.mapping(r -> r.getUser().getUsername(), Collectors.toList())
                        )
                ));

        return messages.stream().map(m -> GroupMessageResponse.builder()
                .id(m.getId())
                .groupId(m.getGroup().getId())
                .username(m.getUser().getUsername())
                .content(m.getContent())
                .createdAt(m.getCreatedAt())
                .reactions(reactionsMap.getOrDefault(m.getId(), Map.of()))
                .build()
        ).collect(Collectors.toList());
    }

    @Transactional
    public GroupResponse requestToJoinGroup(String username, String groupId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        MovieGroup group = getGroupEntity(groupId);

        if (group.getMembers().contains(user)) {
            throw new RuntimeException("User is already a member of this group");
        }

        if (!group.getIsPrivate()) {
            // If it's a public group, join directly
            group.getMembers().add(user);
            groupRepository.save(group);
            return toResponse(group, username);
        }

        // Private group: Create/update join request
        GroupJoinRequest request = joinRequestRepository.findByGroupIdAndUserId(groupId, user.getId())
                .orElseGet(() -> GroupJoinRequest.builder().group(group).user(user).build());

        request.setStatus("PENDING");
        joinRequestRepository.save(request);

        return toResponse(group, username);
    }

    @Transactional(readOnly = true)
    public List<GroupJoinRequestResponse> getAdminJoinRequests(String adminUsername, String status) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        List<GroupJoinRequest> requests;
        if (status != null && !status.isEmpty()) {
            requests = joinRequestRepository.findByAdminIdAndStatus(admin.getId(), status.toUpperCase());
        } else {
            requests = joinRequestRepository.findByAdminId(admin.getId());
        }

        return requests.stream().map(r -> GroupJoinRequestResponse.builder()
                .id(r.getId())
                .groupId(r.getGroup().getId())
                .groupName(r.getGroup().getName())
                .movieTitle(r.getGroup().getMovieTitle())
                .userId(r.getUser().getId())
                .username(r.getUser().getUsername())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .build()
        ).collect(Collectors.toList());
    }

    @Transactional
    public GroupJoinRequestResponse respondToJoinRequest(String adminUsername, Integer requestId, String action) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        GroupJoinRequest request = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Join request not found"));

        if (!request.getGroup().getCreatedBy().getId().equals(admin.getId())) {
            throw new RuntimeException("Only the group creator can approve or reject join requests");
        }

        if ("APPROVE".equalsIgnoreCase(action)) {
            request.setStatus("APPROVED");
            request.getGroup().getMembers().add(request.getUser());
            groupRepository.save(request.getGroup());
        } else {
            request.setStatus("DENIED");
        }

        GroupJoinRequest saved = joinRequestRepository.save(request);

        return GroupJoinRequestResponse.builder()
                .id(saved.getId())
                .groupId(saved.getGroup().getId())
                .groupName(saved.getGroup().getName())
                .movieTitle(saved.getGroup().getMovieTitle())
                .userId(saved.getUser().getId())
                .username(saved.getUser().getUsername())
                .status(saved.getStatus())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Transactional
    public GroupDetailsResponse getDetailedGroup(String groupId, String currentUsername) {
        MovieGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Refresh keywords if older than 1 hour or null
        if (group.getKeywordsUpdatedAt() == null || 
            group.getKeywordsUpdatedAt().isBefore(ZonedDateTime.now().minusHours(1))) {
            updateTrendingKeywords(groupId);
            // Refresh reference
            group = groupRepository.findById(groupId).get();
        }

        boolean isMember = currentUsername != null && group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equals(currentUsername));

        String joinRequestStatus = null;
        if (currentUsername != null && !isMember) {
            Optional<User> userOpt = userRepository.findByUsername(currentUsername);
            if (userOpt.isPresent()) {
                joinRequestStatus = joinRequestRepository.findByGroupIdAndUserId(group.getId(), userOpt.get().getId())
                        .map(GroupJoinRequest::getStatus)
                        .orElse(null);
            }
        }

        // Deserialize trending keywords list
        List<GroupDetailsResponse.KeywordCountResponse> kwResponses = new ArrayList<>();
        if (group.getTrendingKeywords() != null && !group.getTrendingKeywords().isEmpty()) {
            try {
                kwResponses = objectMapper.readValue(group.getTrendingKeywords(), 
                        new TypeReference<List<GroupDetailsResponse.KeywordCountResponse>>() {});
            } catch (Exception e) {
                // Ignore or log
            }
        }

        List<GroupDetailsResponse.MemberResponse> memberResponses = group.getMembers().stream()
                .map(m -> GroupDetailsResponse.MemberResponse.builder()
                        .username(m.getUsername())
                        .fullName(m.getFullName())
                        .profilePicUrl(m.getProfilePicUrl())
                        .build())
                .collect(Collectors.toList());

        return GroupDetailsResponse.builder()
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
                .joinRequestStatus(joinRequestStatus)
                .messageCount(messageRepository.countByGroupId(group.getId()))
                .trendingKeywords(kwResponses)
                .members(memberResponses)
                .build();
    }

    @Transactional
    public void updateTrendingKeywords(String groupId) {
        MovieGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Get messages from last 7 days
        ZonedDateTime sevenDaysAgo = ZonedDateTime.now().minusDays(7);
        List<GroupMessage> recentMessages = messageRepository.findByGroupIdAndCreatedAtAfter(groupId, sevenDaysAgo);

        // Fallback: if no messages in last 7 days, get the last 50 messages of the group
        if (recentMessages.isEmpty()) {
            List<GroupMessage> allMsgs = messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId);
            if (allMsgs.size() > 50) {
                recentMessages = allMsgs.subList(allMsgs.size() - 50, allMsgs.size());
            } else {
                recentMessages = allMsgs;
            }
        }

        // Extract text content
        List<String> texts = recentMessages.stream()
                .map(GroupMessage::getContent)
                .collect(Collectors.toList());

        // Analyze keywords
        List<KeywordAnalyzer.KeywordCount> keywords = keywordAnalyzer.extractTrendingKeywords(texts, 10);

        // Convert to KeywordCountResponse and serialize to JSON
        List<GroupDetailsResponse.KeywordCountResponse> kwResponses = keywords.stream()
                .map(k -> new GroupDetailsResponse.KeywordCountResponse(k.getKeyword(), k.getCount()))
                .collect(Collectors.toList());

        try {
            String keywordsJson = objectMapper.writeValueAsString(kwResponses);
            group.setTrendingKeywords(keywordsJson);
            group.setKeywordsUpdatedAt(ZonedDateTime.now());
            groupRepository.save(group);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize keywords", e);
        }
    }

    @Transactional
    public void toggleReaction(String username, Integer messageId, String reactionType) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        GroupMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        List<String> validTypes = List.of("clap", "film", "thinking", "hundred");
        if (!validTypes.contains(reactionType)) {
            throw new RuntimeException("Invalid reaction type: " + reactionType);
        }

        // Find existing reactions by this user on this message
        List<MessageReaction> existingReactions = messageReactionRepository.findByMessageId(messageId).stream()
                .filter(r -> r.getUser().getId().equals(user.getId()))
                .collect(Collectors.toList());

        if (!existingReactions.isEmpty()) {
            MessageReaction existing = existingReactions.get(0);
            messageReactionRepository.delete(existing);

            // If the toggled reaction is different, add the new one
            if (!existing.getReactionType().equals(reactionType)) {
                MessageReaction newReaction = MessageReaction.builder()
                        .message(message)
                        .user(user)
                        .reactionType(reactionType)
                        .build();
                messageReactionRepository.save(newReaction);
            }
        } else {
            // Save new reaction
            MessageReaction newReaction = MessageReaction.builder()
                    .message(message)
                    .user(user)
                    .reactionType(reactionType)
                    .build();
            messageReactionRepository.save(newReaction);
        }
    }

    @Transactional
    public void deleteMessage(String username, Integer messageId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        GroupMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can only delete your own messages");
        }

        // Clean up reactions first
        List<MessageReaction> reactions = messageReactionRepository.findByMessageId(messageId);
        messageReactionRepository.deleteAll(reactions);

        messageRepository.delete(message);
    }
}
