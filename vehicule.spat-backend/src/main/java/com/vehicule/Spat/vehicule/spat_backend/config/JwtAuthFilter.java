package com.vehicule.Spat.vehicule.spat_backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    // =========================================================
    // ROUTES PUBLIQUES
    // =========================================================
    //
    // Les routes /api/auth/** doivent fonctionner sans JWT :
    // - /api/auth/login
    // - /api/auth/mot-de-passe-oublie
    //
    // Le filtre JWT est donc totalement ignoré pour ces routes.
    // =========================================================

    @Override
    protected boolean shouldNotFilter(
            @NonNull HttpServletRequest request
    ) {

        String uri = request.getRequestURI();

        return uri.startsWith("/api/auth/");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader =
                request.getHeader("Authorization");

        // =====================================================
        // JWT
        // =====================================================

        if (authHeader != null
                && authHeader.startsWith("Bearer ")) {

            String token =
                    authHeader.substring(7).trim();

            try {

                // =============================================
                // VALIDATION DU TOKEN
                // =============================================

                if (jwtUtil.estValide(token)) {

                    String email =
                            jwtUtil.extraireEmail(token);

                    String role =
                            jwtUtil.extraireRole(token);

                    System.out.println(
                            "JWT EMAIL = " + email
                    );

                    System.out.println(
                            "JWT ROLE = [" + role + "]"
                    );

                    // =============================================
                    // NORMALISATION DU ROLE
                    // =============================================

                    if (role != null
                            && !role.trim().isEmpty()) {

                        role = role.trim();

                        /*
                         * Si le JWT contient :
                         *
                         * MECANICIEN_DID
                         *
                         * on construit :
                         *
                         * ROLE_MECANICIEN_DID
                         *
                         *
                         * Si le JWT contient déjà :
                         *
                         * ROLE_MECANICIEN_DID
                         *
                         * on conserve cette valeur.
                         */

                        String authority;

                        if (role.startsWith("ROLE_")) {
                            authority = role;
                        } else {
                            authority = "ROLE_" + role;
                        }

                        // =========================================
                        // AUTHENTIFICATION
                        // =========================================

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        email,
                                        null,
                                        List.of(
                                                new SimpleGrantedAuthority(
                                                        authority
                                                )
                                        )
                                );

                        SecurityContextHolder
                                .getContext()
                                .setAuthentication(
                                        authentication
                                );

                        // =========================================
                        // LOG
                        // =========================================

                        System.out.println(
                                "JWT AUTH → email="
                                        + email
                                        + " | role JWT="
                                        + role
                                        + " | authority="
                                        + authority
                                        + " | URI="
                                        + request.getRequestURI()
                        );
                    }
                }

            } catch (Exception e) {

                /*
                 * Token invalide :
                 *
                 * On efface l'authentification éventuelle
                 * et on laisse Spring Security décider si
                 * la route nécessite une authentification.
                 */

                SecurityContextHolder
                        .clearContext();

                System.out.println(
                        "JWT AUTH → token invalide : "
                                + e.getMessage()
                );
            }
        }

        // =====================================================
        // LOG DE SECURITE
        // =====================================================

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication != null) {

            System.out.println(
                    "SECURITY → method="
                            + request.getMethod()
                            + " | URI="
                            + request.getRequestURI()
                            + " | authenticated="
                            + authentication.isAuthenticated()
                            + " | authorities="
                            + authentication.getAuthorities()
            );

        } else {

            System.out.println(
                    "SECURITY → method="
                            + request.getMethod()
                            + " | URI="
                            + request.getRequestURI()
                            + " | authentication=null"
            );
        }

        // =====================================================
        // SUITE DE LA CHAINE
        // =====================================================

        filterChain.doFilter(
                request,
                response
        );
    }
}
