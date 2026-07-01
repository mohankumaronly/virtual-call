package com.ranger.virtual.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicUserResponse {

    private Long id;
    private String name;
    private String username;
    private String profilePicture;
}