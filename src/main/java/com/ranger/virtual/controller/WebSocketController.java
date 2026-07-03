package com.ranger.virtual.controller;

import com.ranger.virtual.dto.WebSocketMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/meeting/{meetingId}/join")
    @SendTo("/topic/meeting/{meetingId}")
    public WebSocketMessage userJoined(
            @DestinationVariable String meetingId,
            @Payload WebSocketMessage message
    ) {
        log.info("User {} joined meeting: {}", message.getUsername(), meetingId);
        message.setType("USER_JOINED");
        message.setMeetingId(meetingId);
        return message;
    }

    @MessageMapping("/meeting/{meetingId}/leave")
    @SendTo("/topic/meeting/{meetingId}")
    public WebSocketMessage userLeft(
            @DestinationVariable String meetingId,
            @Payload WebSocketMessage message
    ) {
        log.info("User {} left meeting: {}", message.getUsername(), meetingId);
        message.setType("USER_LEFT");
        message.setMeetingId(meetingId);
        return message;
    }

    @MessageMapping("/meeting/{meetingId}/signal")
    public void handleSignal(
            @DestinationVariable String meetingId,
            @Payload WebSocketMessage message
    ) {
        log.info("Signal message from {} in meeting: {}", message.getUsername(), meetingId);
        // Forward to other participants in the room
        messagingTemplate.convertAndSend("/topic/meeting/" + meetingId + "/signal", message);
    }
}