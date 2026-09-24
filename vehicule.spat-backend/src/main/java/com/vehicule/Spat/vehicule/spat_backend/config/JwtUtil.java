package com.vehicule.Spat.vehicule.spat_backend.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    // =========================================================
    // CONFIGURATION JWT
    // =========================================================

    private static final String SECRET =
            "changez-cette-cle-secrete-en-production-32caracteres-minimum";

    private static final long EXPIRATION_MS =
            36_000_000; // 10 heures

    private final SecretKey key =
            Keys.hmacShaKeyFor(
                    SECRET.getBytes(StandardCharsets.UTF_8)
            );

    // =========================================================
    // GENERATION DU TOKEN
    // =========================================================

    public String genererToken(
            String email,
            String role
    ) {

        /*
         * On normalise le rôle avant de le mettre
         * dans le JWT.
         *
         * Exemple :
         *
         * AGENT_FLOTTE
         * ROLE_AGENT_FLOTTE
         *
         * deviennent tous les deux :
         *
         * AGENT_FLOTTE
         */

        String roleNormalise =
                normaliserRole(role);

        return Jwts.builder()

                .subject(email)

                .claim(
                        "role",
                        roleNormalise
                )

                .issuedAt(
                        new Date()
                )

                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + EXPIRATION_MS
                        )
                )

                .signWith(key)

                .compact();
    }

    // =========================================================
    // EXTRACTION EMAIL
    // =========================================================

    public String extraireEmail(
            String token
    ) {

        return extraireClaims(token)
                .getSubject();
    }

    // =========================================================
    // EXTRACTION ROLE
    // =========================================================

    public String extraireRole(
            String token
    ) {

        String role =
                extraireClaims(token)
                        .get("role", String.class);

        return normaliserRole(role);
    }

    // =========================================================
    // VALIDATION
    // =========================================================

    public boolean estValide(
            String token
    ) {

        try {

            extraireClaims(token);

            return true;

        } catch (Exception e) {

            return false;
        }
    }

    // =========================================================
    // NORMALISATION DU ROLE
    // =========================================================

    private String normaliserRole(
            String role
    ) {

        if (role == null) {
            return null;
        }

        String resultat =
                role.trim();

        /*
         * Si le rôle arrive déjà sous la forme :
         *
         * ROLE_AGENT_FLOTTE
         *
         * on retire ROLE_.
         *
         * Le SecurityConfig utilise hasAnyRole(),
         * donc JwtAuthFilter ajoutera ensuite
         * automatiquement ROLE_.
         */

        if (resultat.startsWith("ROLE_")) {

            resultat =
                    resultat.substring(
                            "ROLE_".length()
                    );
        }

        return resultat
                .trim()
                .toUpperCase();
    }

    // =========================================================
    // EXTRACTION DES CLAIMS
    // =========================================================

    private Claims extraireClaims(
            String token
    ) {

        return Jwts.parser()

                .verifyWith(key)

                .build()

                .parseSignedClaims(token)

                .getPayload();
    }
}