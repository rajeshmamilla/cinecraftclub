package com.c3.backend;

import com.c3.backend.dto.GroupRequest;
import com.c3.backend.dto.GroupResponse;
import com.c3.backend.model.User;
import com.c3.backend.model.MovieGroup;
import com.c3.backend.repository.UserRepository;
import com.c3.backend.repository.MovieGroupRepository;
import com.c3.backend.service.GroupService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class BackendApplicationTests {

    @Autowired
    private GroupService groupService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MovieGroupRepository groupRepository;

    @Test
    @Transactional
    void testGroupMembership() {
        // 1. Create a unique test user
        String username = "testuser_" + System.currentTimeMillis();
        User user = User.builder()
                .username(username)
                .email(username + "@example.com")
                .isActive(true)
                .provider("local")
                .build();
        userRepository.save(user);

        // 2. Create another user to be the group owner
        String ownerUsername = "owner_" + System.currentTimeMillis();
        User owner = User.builder()
                .username(ownerUsername)
                .email(ownerUsername + "@example.com")
                .isActive(true)
                .provider("local")
                .build();
        userRepository.save(owner);

        // 3. Create a group
        GroupRequest request = new GroupRequest();
        request.setName("Test Group");
        request.setMovieId(12345);
        request.setMovieTitle("Test Movie");
        request.setMoviePoster("/poster.jpg");
        request.setFocus("Direction");
        request.setKeywords("test");
        request.setDescription("Test description");
        request.setIsPrivate(false);

        GroupResponse created = groupService.createGroup(ownerUsername, request);
        assertNotNull(created);
        Integer groupId = created.getId();

        // 4. Join the group with testuser
        GroupResponse joined = groupService.joinGroup(username, groupId);
        assertNotNull(joined);
        assertTrue(joined.isMember());
        assertEquals(2, joined.getMemberCount());

        // 5. Fetch all public groups and check isMember
        List<GroupResponse> publicGroups = groupService.getAllPublicGroups(username);
        assertFalse(publicGroups.isEmpty());
        GroupResponse groupResponse = publicGroups.stream()
                .filter(g -> g.getId().equals(groupId))
                .findFirst()
                .orElse(null);

        assertNotNull(groupResponse);
        assertTrue(groupResponse.isMember(), "User should be a member of the group!");
        assertEquals(2, groupResponse.getMemberCount());
    }
}
