package com.c3.backend.repository;

import com.c3.backend.model.MovieGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovieGroupRepository extends JpaRepository<MovieGroup, Integer> {

    @Query("SELECT g FROM MovieGroup g JOIN g.members m WHERE m.id = :userId")
    List<MovieGroup> findByMembersId(@Param("userId") Long userId);

    // JOIN FETCH members so isMember check never hits a lazy-load miss
    @Query("SELECT DISTINCT g FROM MovieGroup g LEFT JOIN FETCH g.members WHERE g.movieId = :movieId ORDER BY g.createdAt DESC")
    List<MovieGroup> findByMovieIdAndIsPrivateFalseOrderByCreatedAtDesc(@Param("movieId") Integer movieId);

    @Query("SELECT DISTINCT g FROM MovieGroup g LEFT JOIN FETCH g.members ORDER BY g.createdAt DESC")
    List<MovieGroup> findAllByIsPrivateFalseOrderByCreatedAtDesc();
}
