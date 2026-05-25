package com.c3.backend.repository;

import com.c3.backend.model.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {
    List<MessageReaction> findByMessageId(Integer messageId);
    
    Optional<MessageReaction> findByMessageIdAndUserIdAndReactionType(Integer messageId, Long userId, String reactionType);
    
    @Query("SELECT r FROM MessageReaction r WHERE r.message.group.id = :groupId")
    List<MessageReaction> findByMessageGroupId(@Param("groupId") String groupId);
}
