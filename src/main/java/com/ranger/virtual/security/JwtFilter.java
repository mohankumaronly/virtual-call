package com.ranger.virtual.security;

import com.ranger.virtual.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final AuthService authService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();
        log.info("Processing request: {}", path);

        // Skip authentication for public endpoints
        if (path.startsWith("/api/auth/send-otp") ||
                path.startsWith("/api/auth/verify-otp") ||
                path.startsWith("/ws") ||
                path.startsWith("/topic")) {
            log.info("Public endpoint, skipping authentication");
            filterChain.doFilter(request, response);
            return;
        }

        // Extract token from request (header OR cookie)
        String token = extractTokenFromRequest(request);
        log.info("Token extracted: {}", token != null ? "Yes" : "No");

        if (token != null && jwtService.isTokenValid(token)) {
            String email = jwtService.extractEmail(token);
            log.info("Token valid for email: {}", email);

            UserDetails userDetails = authService.loadUserByUsername(email);

            if (userDetails != null) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.info("User authenticated: {}", email);
            }
        } else {
            log.warn("No valid token found for request: {}", path);
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        // 1. Try Authorization header (Bearer token) - PRIORITY
        String authHeader = request.getHeader("Authorization");
        log.info("Authorization header: {}", authHeader != null ? "Present" : "Not present");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            log.info("Token extracted from Authorization header");
            return token;
        }

        // 2. Try Cookie (fallback)
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            log.info("Cookies present: {}", cookies.length);
            for (Cookie cookie : cookies) {
                log.info("Cookie: {} = {}", cookie.getName(), cookie.getValue());
                if ("jwt".equals(cookie.getName())) {
                    log.info("Token extracted from Cookie");
                    return cookie.getValue();
                }
            }
        } else {
            log.info("No cookies present");
        }

        return null;
    }
}