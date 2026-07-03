package com.ranger.virtual.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebSocketMessage {

    private String type; // USER_JOINED, USER_LEFT, SIGNAL, OFFER, ANSWER, ICE_CANDIDATE
    private String meetingId;
    private Long userId;
    private String username;
    private String name;
    private Object payload; // For WebRTC signaling data
    private Long timestamp;
    private Map<String, Object> data;

    public static WebSocketMessage userJoined(Long userId, String username, String name, String meetingId) {
        return WebSocketMessage.builder()
                .type("USER_JOINED")
                .meetingId(meetingId)
                .userId(userId)
                .username(username)
                .name(name)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    public static WebSocketMessage userLeft(Long userId, String username, String meetingId) {
        return WebSocketMessage.builder()
                .type("USER_LEFT")
                .meetingId(meetingId)
                .userId(userId)
                .username(username)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    public static WebSocketMessage signal(Long userId, String username, String meetingId, Object payload) {
        return WebSocketMessage.builder()
                .type("SIGNAL")
                .meetingId(meetingId)
                .userId(userId)
                .username(username)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}