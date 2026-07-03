package com.ranger.virtual.repository;

import com.ranger.virtual.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    Optional<Meeting> findByMeetingId(String meetingId);

    List<Meeting> findByCreatedByOrderByCreatedAtDesc(Long userId);

    List<Meeting> findByCreatedByAndStatusOrderByCreatedAtDesc(Long userId, Meeting.MeetingStatus status);

    List<Meeting> findByStatus(Meeting.MeetingStatus status);
}