package com.c3.backend.repository;

import com.c3.backend.model.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.time.ZonedDateTime;
import java.util.List;

@Repository
public interface GroupMessageRepository extends JpaRepository<GroupMessage, Integer> {
    List<GroupMessage> findByGroupIdOrderByCreatedAtAsc(String groupId);
    List<GroupMessage> findByGroupIdAndCreatedAtAfter(String groupId, ZonedDateTime dateTime);
}
