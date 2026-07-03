package com.ranger.virtual.dto;

import com.ranger.virtual.entity.Meeting;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingResponse {

    private Long id;
    private String meetingId;
    private String title;
    private Long createdBy;
    private String createdByName;
    private Meeting.MeetingStatus status;
    private LocalDateTime createdAt;
    private Integer participantCount;
}