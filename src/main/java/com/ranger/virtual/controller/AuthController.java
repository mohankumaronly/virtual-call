package com.ranger.virtual.controller;

import com.ranger.virtual.dto.ApiResponse;
import com.ranger.virtual.dto.SendOtpRequest;
import com.ranger.virtual.dto.UserResponse;
import com.ranger.virtual.dto.VerifyOtpRequest;
import com.ranger.virtual.entity.User;
import com.ranger.virtual.security.CustomUserDetails;
import com.ranger.virtual.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        log.info("Sending OTP to email: {}", request.getEmail());
        authService.sendOtp(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("OTP sent successfully"));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request,
            HttpServletResponse response
    ) {
        log.info("Verifying OTP for email: {}", request.getEmail());

        User user = authService.verifyOtp(request.getEmail(), request.getOtp());

        // Generate JWT
        String token = authService.generateJwtToken(user);
        log.info("Generated JWT token for user: {}", user.getEmail());

        // Set cookie (for localhost development)
        Cookie cookie = new Cookie("jwt", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
        log.info("JWT cookie set for user: {}", user.getEmail());

        // Return response with token for frontend
        UserResponse userResponse = UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .email(user.getEmail())
                .profilePicture(user.getProfilePicture())
                .build();

        // Create response with token included
        Map<String, Object> data = new HashMap<>();
        data.put("user", userResponse);
        data.put("token", token);

        return ResponseEntity.ok(ApiResponse.success("Login successful", data));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        UserResponse userResponse = UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .email(user.getEmail())
                .profilePicture(user.getProfilePicture())
                .build();

        return ResponseEntity.ok(ApiResponse.success("User fetched successfully", userResponse));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("jwt", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0); // Delete cookie
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);

        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }
}