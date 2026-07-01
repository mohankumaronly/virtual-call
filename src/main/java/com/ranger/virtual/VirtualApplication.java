package com.ranger.virtual;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class VirtualApplication {

	public static void main(String[] args) {
		// Load .env file and set as system properties
		Dotenv dotenv = Dotenv.configure()
				.filename(".env")
				.ignoreIfMissing()
				.load();

		// Set each property as a system property
		dotenv.entries().forEach(entry -> {
			System.setProperty(entry.getKey(), entry.getValue());
		});

		// Also set them as environment variables for Spring
		// This ensures Spring Boot can resolve ${...} placeholders
		System.setProperty("DB_URL", dotenv.get("DB_URL"));
		System.setProperty("DB_USERNAME", dotenv.get("DB_USERNAME"));
		System.setProperty("DB_PASSWORD", dotenv.get("DB_PASSWORD"));
		System.setProperty("JWT_SECRET", dotenv.get("JWT_SECRET"));
		System.setProperty("JWT_EXPIRATION", dotenv.get("JWT_EXPIRATION"));
		System.setProperty("BREVO_SMTP_HOST", dotenv.get("BREVO_SMTP_HOST"));
		System.setProperty("BREVO_SMTP_PORT", dotenv.get("BREVO_SMTP_PORT"));
		System.setProperty("BREVO_USERNAME", dotenv.get("BREVO_USERNAME"));
		System.setProperty("BREVO_SMTP_KEY", dotenv.get("BREVO_SMTP_KEY"));
		System.setProperty("BREVO_API_KEY", dotenv.get("BREVO_API_KEY"));
		System.setProperty("BREVO_FROM_EMAIL", dotenv.get("BREVO_FROM_EMAIL"));
		System.setProperty("BREVO_FROM_NAME", dotenv.get("BREVO_FROM_NAME"));

		SpringApplication.run(VirtualApplication.class, args);
	}
}