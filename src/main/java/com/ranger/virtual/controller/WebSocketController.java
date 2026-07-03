package com.ranger.virtual.controller;

import com.ranger.virtual.dto.WebSocketMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/meeting/{meetingId}/join")
    public void userJoined(
            @DestinationVariable String meetingId,
            @Payload WebSocketMessage message
    ) {
        log.info("👤 User {} joined meeting: {}", message.getUsername(), meetingId);
        message.setType("USER_JOINED");
        message.setMeetingId(meetingId);

        // Broadcast to ALL subscribers of this meeting
        messagingTemplate.convertAndSend("/topic/meeting/" + meetingId, message);
        log.info("📤 Broadcast USER_JOINED to: /topic/meeting/{}", meetingId);
    }

    @MessageMapping("/meeting/{meetingId}/leave")
    public void userLeft(
            @DestinationVariable String meetingId,
            @Payload WebSocketMessage message
    ) {
        log.info("👤 User {} left meeting: {}", message.getUsername(), meetingId);
        message.setType("USER_LEFT");
        message.setMeetingId(meetingId);

        messagingTemplate.convertAndSend("/topic/meeting/" + meetingId, message);
        log.info("📤 Broadcast USER_LEFT to: /topic/meeting/{}", meetingId);
    }

    @MessageMapping("/meeting/{meetingId}/signal")
    public void handleSignal(
            @DestinationVariable String meetingId,
            @Payload WebSocketMessage message
    ) {
        log.info("📡 Signal from {} in meeting: {}", message.getUsername(), meetingId);
        log.info("📡 Type: {}, Payload: {}", message.getType(), message.getPayload() != null ? "present" : "null");

        messagingTemplate.convertAndSend("/topic/meeting/" + meetingId, message);
        log.info("📤 Broadcast SIGNAL to: /topic/meeting/{}", meetingId);
    }
}