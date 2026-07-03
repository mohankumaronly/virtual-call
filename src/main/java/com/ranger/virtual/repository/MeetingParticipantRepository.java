package com.ranger.virtual.repository;

import com.ranger.virtual.entity.MeetingParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, Long> {

    List<MeetingParticipant> findByMeetingId(Long meetingId);

    Optional<MeetingParticipant> findByMeetingIdAndUserId(Long meetingId, Long userId);

    boolean existsByMeetingIdAndUserId(Long meetingId, Long userId);

    @Modifying
    @Transactional
    @Query("UPDATE MeetingParticipant mp SET mp.leftAt = :leftAt WHERE mp.meetingId = :meetingId AND mp.userId = :userId")
    void updateLeftAtByMeetingIdAndUserId(@Param("meetingId") Long meetingId,
                                          @Param("userId") Long userId,
                                          @Param("leftAt") LocalDateTime leftAt);

    void deleteByMeetingId(Long meetingId);
}