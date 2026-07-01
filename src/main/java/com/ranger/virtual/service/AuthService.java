package com.ranger.virtual.service;

import com.ranger.virtual.entity.Otp;
import com.ranger.virtual.entity.User;
import com.ranger.virtual.repository.OtpRepository;
import com.ranger.virtual.repository.UserRepository;
import com.ranger.virtual.security.CustomUserDetails;
import com.ranger.virtual.security.JwtService;
import com.ranger.virtual.util.OtpGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final OtpRepository otpRepository;
    private final OtpGenerator otpGenerator;
    private final EmailService emailService;
    private final JwtService jwtService;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        return new CustomUserDetails(user);
    }

    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));

        return new CustomUserDetails(user);
    }

    @Transactional
    public void sendOtp(String email) {
        // Validate email format
        if (!isValidEmail(email)) {
            throw new IllegalArgumentException("Invalid email format");
        }

        // Delete existing OTP
        otpRepository.deleteByEmail(email);

        // Generate new OTP
        String otpCode = otpGenerator.generateOtp();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5);

        // Save OTP
        Otp otp = Otp.builder()
                .email(email)
                .otp(otpCode)
                .expiresAt(expiresAt)
                .build();
        otpRepository.save(otp);

        // Send email
        emailService.sendOtpEmail(email, otpCode);

        log.info("OTP sent to: {}", email);
    }

    @Transactional
    public User verifyOtp(String email, String otpCode) {
        // Find OTP
        Otp otp = otpRepository.findByEmailAndOtp(email, otpCode)
                .orElseThrow(() -> new RuntimeException("Invalid OTP"));

        // Check if expired
        if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpRepository.delete(otp);
            throw new RuntimeException("OTP has expired");
        }

        // Delete OTP after verification
        otpRepository.delete(otp);

        // Find or create user
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    // Create new user
                    String username = generateUsername(email);
                    String name = extractNameFromEmail(email);

                    User newUser = User.builder()
                            .email(email)
                            .username(username)
                            .name(name)
                            .verified(true)
                            .build();

                    return userRepository.save(newUser);
                });

        // Update verified status if not verified
        if (!user.getVerified()) {
            user.setVerified(true);
            userRepository.save(user);
        }

        return user;
    }

    public String generateJwtToken(User user) {
        return jwtService.generateToken(user);
    }

    private boolean isValidEmail(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@(.+)$";
        return email != null && email.matches(emailRegex);
    }

    private String generateUsername(String email) {
        // Extract username from email (before @)
        String baseUsername = email.split("@")[0];

        // Check if username exists
        String username = baseUsername;
        int counter = 1;
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }

        return username;
    }

    private String extractNameFromEmail(String email) {
        // Extract name from email (before @) and capitalize
        String name = email.split("@")[0];
        // Replace dots and underscores with spaces
        name = name.replace(".", " ").replace("_", " ");
        // Capitalize first letter of each word
        String[] words = name.split(" ");
        StringBuilder capitalized = new StringBuilder();
        for (String word : words) {
            if (!word.isEmpty()) {
                capitalized.append(Character.toUpperCase(word.charAt(0)))
                        .append(word.substring(1).toLowerCase())
                        .append(" ");
            }
        }
        return capitalized.toString().trim();
    }
}