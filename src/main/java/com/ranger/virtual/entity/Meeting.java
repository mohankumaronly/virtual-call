package com.ranger.virtual.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "meetings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "meeting_id", nullable = false, unique = true)
    private String meetingId; // UUID

    @Column(name = "title")
    private String title;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private MeetingStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum MeetingStatus {
        ACTIVE, ENDED
    }
}