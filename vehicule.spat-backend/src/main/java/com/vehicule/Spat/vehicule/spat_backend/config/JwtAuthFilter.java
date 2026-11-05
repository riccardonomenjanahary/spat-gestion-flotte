package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
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
import java.util.Locale;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
        private final UtilisateurRepository utilisateurRepository;

        public JwtAuthFilter(JwtUtil jwtUtil, UtilisateurRepository utilisateurRepository) {
        this.jwtUtil = jwtUtil;
                this.utilisateurRepository = utilisateurRepository;
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

                    String matricule =
                            jwtUtil.extraireEmail(token);

                    Utilisateur utilisateur = utilisateurRepository
                            .findByMatricule(matricule)
                            .filter(Utilisateur::isActif)
                            .orElse(null);

                    String role = utilisateur == null || utilisateur.getRole() == null
                            ? null
                            : utilisateur.getRole().trim().replaceFirst("^ROLE_", "")
                                    .toUpperCase(Locale.ROOT);

                    System.out.println(
                            "JWT MATRICULE = " + matricule
                    );

                    System.out.println(
                            "ROLE COMPTE ACTUEL = [" + role + "]"
                    );

                    // =============================================
                    // NORMALISATION DU ROLE
                    // =============================================

                    if (role != null && !role.isBlank() && !"CHAUFFEUR".equals(role)) {

                        /*
                         * Si le compte contient :
                         *
                         * MECANICIEN_DID
                         *
                         * on construit :
                         *
                         * ROLE_MECANICIEN_DID
                         *
                         *
                         * Si le compte contient déjà :
                         *
                         * ROLE_MECANICIEN_DID
                         *
                         * on conserve cette valeur.
                         */

                        String authority;
                        String roleCompat = switch (role) {
                            case "CHEF_ATELIER" -> "MECANICIEN_DID";
                            case "DIRECTION_GENERALE", "CONTROLE_GESTION" -> "CO_ADMIN";
                            default -> role;
                        };

                        if (roleCompat.startsWith("ROLE_")) {
                            authority = roleCompat;
                        } else {
                            authority = "ROLE_" + roleCompat;
                        }

                        // =========================================
                        // AUTHENTIFICATION
                        // =========================================

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        matricule,
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
                                "JWT AUTH → matricule="
                                        + matricule
                                        + " | rôle actuel="
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
