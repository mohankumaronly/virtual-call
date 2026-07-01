package com.ranger.virtual.controller;

import com.ranger.virtual.dto.ApiResponse;
import com.ranger.virtual.dto.PublicUserResponse;
import com.ranger.virtual.entity.User;
import com.ranger.virtual.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse> searchUsers(@RequestParam String q) {
        log.info("Searching users with query: {}", q);

        List<User> users = userService.searchUsers(q);

        List<PublicUserResponse> responses = users.stream()
                .map(user -> PublicUserResponse.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .username(user.getUsername())
                        .profilePicture(user.getProfilePicture())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Users fetched successfully", responses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse> getUserProfile(@PathVariable Long id) {
        log.info("Fetching user profile for id: {}", id);

        User user = userService.getUserById(id);

        PublicUserResponse response = PublicUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .profilePicture(user.getProfilePicture())
                .build();

        return ResponseEntity.ok(ApiResponse.success("User profile fetched successfully", response));
    }
}