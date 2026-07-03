package com.ranger.virtual.service;

import com.ranger.virtual.dto.MeetingParticipantResponse;
import com.ranger.virtual.dto.MeetingResponse;
import com.ranger.virtual.entity.Meeting;
import com.ranger.virtual.entity.MeetingParticipant;
import com.ranger.virtual.entity.User;
import com.ranger.virtual.repository.MeetingParticipantRepository;
import com.ranger.virtual.repository.MeetingRepository;
import com.ranger.virtual.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MeetingParticipantRepository meetingParticipantRepository;
    private final UserRepository userRepository;

    @Transactional
    public MeetingResponse createMeeting(Long userId, String title) {
        // Generate UUID for meeting
        String meetingId = UUID.randomUUID().toString();

        // Create meeting
        Meeting meeting = Meeting.builder()
                .meetingId(meetingId)
                .title(title != null ? title : "Meeting " + meetingId.substring(0, 8))
                .createdBy(userId)
                .status(Meeting.MeetingStatus.ACTIVE)
                .build();

        Meeting savedMeeting = meetingRepository.save(meeting);

        // Auto-join creator as participant
        MeetingParticipant participant = MeetingParticipant.builder()
                .meetingId(savedMeeting.getId())
                .userId(userId)
                .joinedAt(LocalDateTime.now())
                .build();
        meetingParticipantRepository.save(participant);

        log.info("Meeting created with ID: {} by user: {}", meetingId, userId);

        return toMeetingResponse(savedMeeting);
    }

    public MeetingResponse getMeetingByMeetingId(String meetingId) {
        Meeting meeting = meetingRepository.findByMeetingId(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found with ID: " + meetingId));

        return toMeetingResponse(meeting);
    }

    public Meeting getMeetingEntityByMeetingId(String meetingId) {
        return meetingRepository.findByMeetingId(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found with ID: " + meetingId));
    }

    @Transactional
    public void joinMeeting(Long userId, String meetingId) {
        Meeting meeting = getMeetingEntityByMeetingId(meetingId);

        // Check if meeting is active
        if (meeting.getStatus() != Meeting.MeetingStatus.ACTIVE) {
            throw new RuntimeException("Meeting is not active");
        }

        // Check if already joined
        if (meetingParticipantRepository.existsByMeetingIdAndUserId(meeting.getId(), userId)) {
            throw new RuntimeException("User already joined this meeting");
        }

        // Add participant
        MeetingParticipant participant = MeetingParticipant.builder()
                .meetingId(meeting.getId())
                .userId(userId)
                .joinedAt(LocalDateTime.now())
                .build();
        meetingParticipantRepository.save(participant);

        log.info("User {} joined meeting: {}", userId, meetingId);
    }

    @Transactional
    public void leaveMeeting(Long userId, String meetingId) {
        Meeting meeting = getMeetingEntityByMeetingId(meetingId);

        meetingParticipantRepository.updateLeftAtByMeetingIdAndUserId(
                meeting.getId(),
                userId,
                LocalDateTime.now()
        );

        log.info("User {} left meeting: {}", userId, meetingId);
    }

    public List<MeetingResponse> getMeetingHistory(Long userId) {
        List<Meeting> meetings = meetingRepository.findByCreatedByOrderByCreatedAtDesc(userId);
        return meetings.stream()
                .limit(20) // Last 20 meetings
                .map(this::toMeetingResponse)
                .collect(Collectors.toList());
    }

    public List<MeetingParticipantResponse> getMeetingParticipants(String meetingId) {
        Meeting meeting = getMeetingEntityByMeetingId(meetingId);

        List<MeetingParticipant> participants = meetingParticipantRepository.findByMeetingId(meeting.getId());

        return participants.stream()
                .map(participant -> {
                    User user = userRepository.findById(participant.getUserId())
                            .orElse(null);

                    return MeetingParticipantResponse.builder()
                            .userId(participant.getUserId())
                            .userName(user != null ? user.getName() : "Unknown")
                            .userUsername(user != null ? user.getUsername() : "unknown")
                            .joinedAt(participant.getJoinedAt())
                            .leftAt(participant.getLeftAt())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void endMeeting(String meetingId) {
        Meeting meeting = getMeetingEntityByMeetingId(meetingId);
        meeting.setStatus(Meeting.MeetingStatus.ENDED);
        meetingRepository.save(meeting);

        log.info("Meeting ended: {}", meetingId);
    }

    private MeetingResponse toMeetingResponse(Meeting meeting) {
        // Get participant count
        List<MeetingParticipant> participants = meetingParticipantRepository.findByMeetingId(meeting.getId());
        int participantCount = participants.size();

        // Get creator name
        String creatorName = "Unknown";
        User creator = userRepository.findById(meeting.getCreatedBy()).orElse(null);
        if (creator != null) {
            creatorName = creator.getName();
        }

        return MeetingResponse.builder()
                .id(meeting.getId())
                .meetingId(meeting.getMeetingId())
                .title(meeting.getTitle())
                .createdBy(meeting.getCreatedBy())
                .createdByName(creatorName)
                .status(meeting.getStatus())
                .createdAt(meeting.getCreatedAt())
                .participantCount(participantCount)
                .build();
    }
}