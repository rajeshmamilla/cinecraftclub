package com.c3.backend.repository;

import com.c3.backend.model.GroupJoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupJoinRequestRepository extends JpaRepository<GroupJoinRequest, Integer> {

    Optional<GroupJoinRequest> findByGroupIdAndUserId(Integer groupId, Long userId);

    List<GroupJoinRequest> findByUserId(Long userId);

    @Query("SELECT r FROM GroupJoinRequest r JOIN FETCH r.group g JOIN FETCH r.user u WHERE g.createdBy.id = :adminId ORDER BY r.createdAt DESC")
    List<GroupJoinRequest> findByAdminId(@Param("adminId") Long adminId);

    @Query("SELECT r FROM GroupJoinRequest r JOIN FETCH r.group g JOIN FETCH r.user u WHERE g.createdBy.id = :adminId AND r.status = :status ORDER BY r.createdAt DESC")
    List<GroupJoinRequest> findByAdminIdAndStatus(@Param("adminId") Long adminId, @Param("status") String status);
}
