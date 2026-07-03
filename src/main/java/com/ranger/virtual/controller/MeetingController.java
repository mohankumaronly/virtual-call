package com.ranger.virtual.controller;

import com.ranger.virtual.dto.ApiResponse;
import com.ranger.virtual.dto.CreateMeetingRequest;
import com.ranger.virtual.dto.MeetingParticipantResponse;
import com.ranger.virtual.dto.MeetingResponse;
import com.ranger.virtual.security.CustomUserDetails;
import com.ranger.virtual.service.MeetingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
@Slf4j
public class MeetingController {

    private final MeetingService meetingService;

    @PostMapping
    public ResponseEntity<ApiResponse> createMeeting(@RequestBody(required = false) CreateMeetingRequest request) {
        Long userId = getCurrentUserId();
        log.info("Creating meeting for user: {}", userId);

        String title = request != null ? request.getTitle() : null;
        MeetingResponse meeting = meetingService.createMeeting(userId, title);

        return ResponseEntity.ok(ApiResponse.success("Meeting created successfully", meeting));
    }

    @GetMapping("/{meetingId}")
    public ResponseEntity<ApiResponse> getMeeting(@PathVariable String meetingId) {
        log.info("Fetching meeting with ID: {}", meetingId);

        MeetingResponse meeting = meetingService.getMeetingByMeetingId(meetingId);

        return ResponseEntity.ok(ApiResponse.success("Meeting fetched successfully", meeting));
    }

    @PostMapping("/{meetingId}/join")
    public ResponseEntity<ApiResponse> joinMeeting(@PathVariable String meetingId) {
        Long userId = getCurrentUserId();
        log.info("User {} joining meeting: {}", userId, meetingId);

        meetingService.joinMeeting(userId, meetingId);

        MeetingResponse meeting = meetingService.getMeetingByMeetingId(meetingId);

        return ResponseEntity.ok(ApiResponse.success("Joined meeting successfully", meeting));
    }

    @PostMapping("/{meetingId}/leave")
    public ResponseEntity<ApiResponse> leaveMeeting(@PathVariable String meetingId) {
        Long userId = getCurrentUserId();
        log.info("User {} leaving meeting: {}", userId, meetingId);

        meetingService.leaveMeeting(userId, meetingId);

        return ResponseEntity.ok(ApiResponse.success("Left meeting successfully"));
    }

    @GetMapping("/{meetingId}/participants")
    public ResponseEntity<ApiResponse> getMeetingParticipants(@PathVariable String meetingId) {
        log.info("Fetching participants for meeting: {}", meetingId);

        List<MeetingParticipantResponse> participants = meetingService.getMeetingParticipants(meetingId);

        return ResponseEntity.ok(ApiResponse.success("Participants fetched successfully", participants));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse> getMeetingHistory() {
        Long userId = getCurrentUserId();
        log.info("Fetching meeting history for user: {}", userId);

        List<MeetingResponse> meetings = meetingService.getMeetingHistory(userId);

        return ResponseEntity.ok(ApiResponse.success("Meeting history fetched successfully", meetings));
    }

    @PostMapping("/{meetingId}/end")
    public ResponseEntity<ApiResponse> endMeeting(@PathVariable String meetingId) {
        Long userId = getCurrentUserId();
        log.info("User {} ending meeting: {}", userId, meetingId);

        MeetingResponse meeting = meetingService.getMeetingByMeetingId(meetingId);

        // Check if user is the creator
        if (!meeting.getCreatedBy().equals(userId)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Only the meeting creator can end the meeting"));
        }

        meetingService.endMeeting(meetingId);

        return ResponseEntity.ok(ApiResponse.success("Meeting ended successfully"));
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getId();
    }
}