package com.ggbank;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * GG BANK - Smart Digital Banking Management System
 * "Secure Banking. Smarter Future."
 */
@SpringBootApplication
public class GgBankApplication {

    public static void main(String[] args) {
        SpringApplication.run(GgBankApplication.class, args);
        System.out.println("=================================================");
        System.out.println("  GG BANK REST Engine Started Successfully       ");
        System.out.println("  Context: http://localhost:8080/api             ");
        System.out.println("  Secure Banking. Smarter Future.                ");
        System.out.println("=================================================");
    }
}
