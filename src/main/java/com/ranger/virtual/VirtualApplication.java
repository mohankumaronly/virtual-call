package com.ranger.virtual;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class VirtualApplication {

	public static void main(String[] args) {
		Dotenv dotenv = Dotenv.configure()
				.filename(".env")
				.ignoreIfMissing()
				.load();

		dotenv.entries().forEach(entry -> {
			System.setProperty(entry.getKey(), entry.getValue());
		});

		SpringApplication.run(VirtualApplication.class, args);
	}
}