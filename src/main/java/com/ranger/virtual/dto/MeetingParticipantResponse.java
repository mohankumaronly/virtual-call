package com.ranger.virtual.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingParticipantResponse {

    private Long userId;
    private String userName;
    private String userUsername;
    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
}