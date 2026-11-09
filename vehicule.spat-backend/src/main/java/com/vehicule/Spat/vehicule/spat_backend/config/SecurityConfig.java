package com.vehicule.Spat.vehicule.spat_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {
    @org.springframework.beans.factory.annotation.Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl = "http://localhost:3000";

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(
            UserDetailsServiceImpl userDetailsService,
            JwtAuthFilter jwtAuthFilter
    ) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthFilter = jwtAuthFilter;
    }

    // =========================================================
    // PASSWORD
    // =========================================================

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // =========================================================
    // AUTHENTICATION PROVIDER
    // =========================================================

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(userDetailsService);

        provider.setPasswordEncoder(
                passwordEncoder()
        );

        return provider;
    }

    // =========================================================
    // AUTHENTICATION MANAGER
    // =========================================================

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {

        return config.getAuthenticationManager();
    }

    // =========================================================
    // CORS
    // =========================================================

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(
                List.of(
                        frontendUrl.replaceAll("/+$", "")
                )
        );

        configuration.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        configuration.setAllowedHeaders(
                List.of("*")
        );

        configuration.setAllowCredentials(
                true
        );

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration
        );

        return source;
    }

    // =========================================================
    // SECURITY FILTER CHAIN
    // =========================================================

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http
    ) throws Exception {

        http

                // =================================================
                // CONFIGURATION GENERALE
                // =================================================

                .csrf(
                        csrf ->
                                csrf.disable()
                )

                .cors(
                        cors ->
                                cors.configurationSource(
                                        corsConfigurationSource()
                                )
                )

                .sessionManagement(
                        session ->
                                session.sessionCreationPolicy(
                                        SessionCreationPolicy.STATELESS
                                )
                )

                // =================================================
                // AUTORISATIONS
                // =================================================

                .authorizeHttpRequests(
                        auth -> auth

                                .requestMatchers(HttpMethod.POST, "/api/requisitions", "/api/requisitions/**")
                                .hasRole("CHEF_DGAL")
                                .requestMatchers(HttpMethod.PUT, "/api/requisitions/**")
                                .hasRole("CHEF_DGAL")

                                .requestMatchers(
                                        HttpMethod.OPTIONS,
                                        "/**"
                                )
                                .permitAll()

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/auth/mot-de-passe-oublie"
                                )
                                .permitAll()

                                /*
                                 * Toutes les routes d'authentification
                                 * restent publiques :
                                 * - /api/auth/login
                                 * - /api/auth/mot-de-passe-oublie
                                 * - autres routes /api/auth/**
                                 */
                                .requestMatchers(
                                        "/api/auth/**"
                                )
                                .permitAll()

                                /*
                                 * Autorise aussi le dispatcher d'erreur Spring.
                                 * Cela évite qu'une vraie erreur backend soit
                                 * masquée par un 401/403 sur /error.
                                 */
                                .requestMatchers(
                                        "/error"
                                )
                                .permitAll()

                                // Le co-admin peut lire les données, mais aucune écriture API.
                                .requestMatchers(request -> {
                                    var authentication = SecurityContextHolder.getContext().getAuthentication();
                                    boolean coAdmin = authentication != null
                                            && authentication.getAuthorities().stream()
                                            .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + Roles.CO_ADMIN)
                                                    || authority.getAuthority().equals("ROLE_" + Roles.DIRECTEUR_DFP));
                                    return coAdmin
                                            && !HttpMethod.GET.matches(request.getMethod())
                                            && !HttpMethod.OPTIONS.matches(request.getMethod());
                                })
                                .denyAll()

                                // =========================================
                                // GPS
                                // NE PAS MODIFIER
                                // =========================================

                                .requestMatchers("/api/navettes-pact", "/api/navettes-pact/**")
                                .hasRole(Roles.CHEF_SERVICE_LOGISTIQUE)
                                .requestMatchers(HttpMethod.PUT, "/api/reservations/*/assistant-direction/decision")
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT)
                                .requestMatchers(HttpMethod.POST, "/api/reservations/assistant-direction/rapide",
                                        "/api/reservations/*/assistant-direction/cloturer")
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT)
                                .requestMatchers(HttpMethod.PUT, "/api/conducteurs-autorises/*/valider")
                                .hasAnyRole(Roles.CHEF_DIRECTION, Roles.AGENT_PAR_INTERIM_CHEF)
                                .requestMatchers(HttpMethod.POST, "/api/conducteurs-autorises")
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT, Roles.CHEF_DIRECTION, Roles.ADMIN, Roles.SUPER_ADMIN)
                                .requestMatchers(HttpMethod.PUT, "/api/conducteurs-autorises/**")
                                .hasAnyRole(Roles.CHEF_DIRECTION, Roles.ADMIN, Roles.SUPER_ADMIN)
                                .requestMatchers(HttpMethod.GET, "/api/conducteurs-autorises/**")
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT, Roles.CHEF_DIRECTION, Roles.AGENT_PAR_INTERIM_CHEF, Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_DGAL, Roles.CO_ADMIN, Roles.DIRECTEUR_DFP)
                                .requestMatchers(HttpMethod.GET, "/api/requisitions/**")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_DGAL, Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE, Roles.CO_ADMIN, Roles.DIRECTEUR_DFP)
                                .requestMatchers(HttpMethod.PUT, "/api/signalements-incidents/**")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.MECANICIEN_DID, Roles.AGENT_FLOTTE)
                                .requestMatchers(HttpMethod.GET, "/api/signalements-incidents/**")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_SERVICE_LOGISTIQUE, Roles.AGENT_FLOTTE,
                                        Roles.CHEF_DGAL, Roles.MECANICIEN_DID, Roles.CO_ADMIN, Roles.DIRECTEUR_DFP)
                                .requestMatchers(HttpMethod.POST, "/api/signalements-incidents")
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT,
                                        Roles.CHEF_DIRECTION, Roles.AGENT_PAR_INTERIM_CHEF,
                                        Roles.MECANICIEN_DID, Roles.CHEF_ATELIER)
                                .requestMatchers(HttpMethod.GET, "/api/personnels/ma-direction")
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT)
                                .requestMatchers(HttpMethod.POST, "/api/indisponibilites")
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.CHEF_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT, Roles.AGENT_PAR_INTERIM_CHEF)
                                .requestMatchers(HttpMethod.POST, "/api/carnet-bord", "/api/carnet-bord/**")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE, Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT)
                                .requestMatchers(HttpMethod.GET, "/api/carnet-bord", "/api/carnet-bord/**")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE, Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT, Roles.CHEF_DGAL, Roles.AGENT_SURETE,
                                        Roles.CO_ADMIN, Roles.DIRECTEUR_DFP)
                                .requestMatchers(HttpMethod.PUT, "/api/carnet-bord/**")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE, Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT)
                                .requestMatchers(HttpMethod.GET, "/api/justificatifs/a-valider")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_SERVICE_LOGISTIQUE, Roles.CHEF_DGAL)

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/gps/positions"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN,
                                        Roles.CHEF_DGAL,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.AGENT_SURETE,
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT,
                                        Roles.CHEF_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_CHEF
                                )

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/gps/positions-direction"
                                )
                                .hasAnyRole(
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT,
                                        Roles.CHEF_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_CHEF
                                )

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/gps/positions/**",
                                        "/api/gps/historique"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN,
                                        Roles.CHEF_DGAL,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.AGENT_SURETE
                                )

                                // =========================================
                                // RESERVATIONS / MISSIONS
                                // =========================================

                                /*
                                 * TICKET EXPRESS
                                 *
                                 * Cette route permet de créer rapidement
                                 * une mission urgente reçue par téléphone,
                                 * oralement ou par un autre canal immédiat.
                                 *
                                 * Elle n'est volontairement pas accessible
                                 * aux demandeurs ordinaires.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/reservations/urgence-express"
                                )
                                .denyAll()

                                /*
                                 * RELANCE DU CONTROLE DID APRES AVIS DEFAVORABLE
                                 * Route réservée au Chef du Service Logistique.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/reservations/*/relancer-avis-did"
                                )
                                .hasRole(Roles.CHEF_SERVICE_LOGISTIQUE)

                                /*
                                 * DECISION NIVEAU 1
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/reservations/*/decision"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT
                                )

                                /*
                                 * VALIDATION NIVEAU 2
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/reservations/*/validation-n2"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_DGAL,
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT
                                )

                                .requestMatchers(HttpMethod.DELETE, "/api/reservations/*/chef-dgal")
                                .hasAnyRole(Roles.CHEF_DGAL, Roles.ADMIN, Roles.SUPER_ADMIN)

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/reservations/*/demande-avis-entretien"
                                )
                                .hasAnyRole(
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT
                                )

                                /*
                                 * AVIS CHEF DE DIRECTION
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/reservations/*/avis-chef-direction"
                                )
                                .hasAnyRole(
                                        Roles.CHEF_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_CHEF
                                )

                                /*
                                 * CREATION D'UNE DEMANDE NORMALE
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/reservations"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.CHEF_DIRECTION,
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT,
                                        Roles.AGENT_PAR_INTERIM_CHEF,
                                        Roles.AGENT_SURETE
                                )

                                /*
                                 * CONSULTATION DE SES PROPRES DEMANDES : ASSISTANT DE DIRECTION
                                 * Doit precéder la règle plus large /api/reservations/**.
                                 * Le controleur /mes doit identifier le demandeur via le JWT.
                                 */

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/reservations/mes"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.CHEF_DIRECTION,
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT,
                                        Roles.AGENT_PAR_INTERIM_CHEF,
                                        Roles.CHEF_DGAL,
                                        Roles.AGENT_FLOTTE,
                                        Roles.AGENT_SURETE
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/reservations/*/assistant-direction/historique"
                                )
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT)

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/reservations/assistant-direction/**"
                                )
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT)

                                /*
                                 * CONSULTATION DES RESERVATIONS
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/reservations/*/ordre-mission/destinataire"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE
                                )

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/reservations/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.CHEF_DIRECTION,
                                        Roles.CHEF_DGAL,
                                        Roles.AGENT_FLOTTE,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN,
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT,
                                        Roles.AGENT_PAR_INTERIM_CHEF
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/reservations/*/ordre-mission/email"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.CHEF_DIRECTION,
                                        Roles.CHEF_DGAL,
                                        Roles.AGENT_FLOTTE,
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT,
                                        Roles.AGENT_PAR_INTERIM_CHEF
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/reservations/*/assistant-direction"
                                )
                                .hasAnyRole(Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT)

                                // =========================================
                                // VEHICULE -> CHAUFFEUR ACTIF
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/vehicules/*/directions"
                                )
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN)

                                // Seuls les gestionnaires du parc modifient les véhicules.
                                .requestMatchers(HttpMethod.POST, "/api/vehicules")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_SERVICE_LOGISTIQUE, Roles.AGENT_FLOTTE)
                                .requestMatchers(HttpMethod.PUT, "/api/vehicules/*")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_SERVICE_LOGISTIQUE, Roles.AGENT_FLOTTE)
                                .requestMatchers(HttpMethod.DELETE, "/api/vehicules/*")
                                .hasAnyRole(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CHEF_SERVICE_LOGISTIQUE, Roles.AGENT_FLOTTE)

                                // Le mécanicien DID doit pouvoir lire le
                                // référentiel des véhicules pour ouvrir la
                                // fiche de contrôle qui lui est attribuée.
                                // L'assistant et son intérim utilisent cette
                                // liste dans le formulaire de signalement d'incident.
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/vehicules"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.CHEF_DIRECTION,
                                        Roles.CHEF_DGAL,
                                        Roles.AGENT_FLOTTE,
                                        Roles.MECANICIEN_DID,
                                        Roles.AGENT_SURETE,
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT,
                                        "MECANICIEN",
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN
                                )

                                /*
                                 * Lecture uniquement.
                                 *
                                 * Le Chef de Direction doit pouvoir choisir
                                 * un véhicule lors de la création d'un ticket
                                 * et consulter automatiquement le chauffeur
                                 * qui possède l'affectation ACTIVE.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/vehicules/*/chauffeur-actif"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.CHEF_DIRECTION,
                                        Roles.AGENT_FLOTTE
                                )

                                // =========================================
                                // VEHICULE -> CHAUFFEURS PAR AFFECTATION
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/vehicules/*/chauffeur-actif",
                                        "/api/vehicules/*/chauffeur-auto",
                                        "/api/vehicules/*/chauffeurs-compatibles"
                                )
                                .authenticated()

                                // =========================================
                                // ANCIEN CIRCUIT D’URGENCE : HISTORIQUE EN LECTURE SEULE
                                // =========================================
                                .requestMatchers(HttpMethod.POST,
                                        "/api/agent-flotte/tickets/*/urgence-derniere-minute",
                                        "/api/reservations/*/urgence-chef-logistique")
                                .denyAll()
                                .requestMatchers(HttpMethod.GET,
                                        "/api/agent-flotte/urgences-derniere-minute")
                                .hasRole(Roles.AGENT_FLOTTE)

                                // =========================================
                                // MAINTENANCES
                                // =========================================

                                // Nouveau circuit d'entretien : chaque action est réservée à son rôle.
                                .requestMatchers(HttpMethod.POST,
                                        "/api/maintenances/demandes-entretien")
                                .hasAnyRole(Roles.MECANICIEN_DID, Roles.ASSISTANT_DIRECTION, Roles.AGENT_PAR_INTERIM_ASSISTANT)

                                .requestMatchers(HttpMethod.PUT,
                                        "/api/maintenances/*/decision-entretien")
                                .hasRole(Roles.CHEF_SERVICE_LOGISTIQUE)

                                .requestMatchers(HttpMethod.PUT,
                                        "/api/maintenances/*/transmettre-periodique")
                                .hasRole(Roles.CHEF_SERVICE_LOGISTIQUE)

                                .requestMatchers(HttpMethod.POST,
                                        "/api/reservations/*/demande-avis-arrivee",
                                        "/api/reservations/*/cloturer-apres-avis-did",
                                        "/api/reservations/*/cloturer-urgence")
                                .hasRole(Roles.CHEF_SERVICE_LOGISTIQUE)

                                .requestMatchers(HttpMethod.PUT,
                                        "/api/maintenances/*/cloturer-entretien",
                                        "/api/maintenances/*/annuler-entretien")
                                .hasRole(Roles.CHEF_SERVICE_LOGISTIQUE)

                                .requestMatchers(HttpMethod.PUT,
                                        "/api/maintenances/*/terminer-entretien")
                                .hasAnyRole(Roles.MECANICIEN_DID, "MECANICIEN")

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/maintenances/*/avis-did",
                                        "/api/maintenances/*/controle-avant-mission",
                                        "/api/maintenances/*/controle-apres-mission"
                                )
                                .hasAnyRole(
                                        Roles.MECANICIEN_DID,
                                        "MECANICIEN"
                                )

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/maintenances/en-attente-avis"
                                )
                                .hasAnyRole(
                                        Roles.MECANICIEN_DID,
                                        "MECANICIEN"
                                )

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/maintenances",
                                        "/api/maintenances/**",
                                        "/api/entretien-periodique"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.CHEF_DGAL,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN,
                                        Roles.MECANICIEN_DID,
                                        "MECANICIEN",
                                        Roles.ASSISTANT_DIRECTION,
                                        Roles.AGENT_PAR_INTERIM_ASSISTANT
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/maintenances"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/maintenances/*/statut"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/maintenances/*/planifier"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE
                                )

                                // =========================================
                                // DASHBOARD
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/dashboard/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.CHEF_DGAL,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN
                                )

                                // =========================================
                                // ASSURANCES
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/assurances",
                                        "/api/assurances/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.CHEF_DGAL,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/assurances",
                                        "/api/assurances/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/assurances/*"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/assurances/*"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                // =========================================
                                // SINISTRES
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/sinistres",
                                        "/api/sinistres/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.CHEF_DGAL,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/sinistres",
                                        "/api/sinistres/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/sinistres/*"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/sinistres/*/statut"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/sinistres/*"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                // =========================================
                                // CARBURANT
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/carburant",
                                        "/api/carburant/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.CHEF_DGAL,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/carburant",
                                        "/api/carburant/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/carburant/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                // =========================================
                                // ADMINISTRATION
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/admin/modifications",
                                        "/api/admin/modifications/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CO_ADMIN,
                                        Roles.DIRECTEUR_DFP
                                )

                                // Les listes d'administration doivent être accessibles
                                // au Super Admin et à l'Admin connecté.
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/admin/utilisateurs",
                                        "/api/admin/utilisateurs/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CO_ADMIN,
                                        Roles.DIRECTEUR_DFP
                                )

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/admin/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN
                                )

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/admin/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/admin/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/admin/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )

                                // =========================================
                                // AFFECTATIONS / MISSIONS
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/affectations",
                                        "/api/affectations/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.CHEF_DGAL,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN
                                )

                                .requestMatchers(
                                        "/api/affectations",
                                        "/api/affectations/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

                                // =========================================
                                // RAPPORTS
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/rapports",
                                        "/api/rapports/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CO_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.CHEF_DGAL
                                )

                                .requestMatchers(
                                        "/api/rapports",
                                        "/api/rapports/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )

                                // =========================================
                                // JUSTIFICATIFS (documents du dispositif)
                                // =========================================

                                .requestMatchers(HttpMethod.POST, "/api/fiches-surete")
                                .hasAnyRole(Roles.AGENT_SURETE)
                                .requestMatchers(HttpMethod.GET, "/api/fiches-surete/profil")
                                .hasAnyRole(Roles.AGENT_SURETE)
                                .requestMatchers(HttpMethod.GET, "/api/fiches-surete", "/api/fiches-surete/**")
                                .hasAnyRole(Roles.CHEF_DGAL, Roles.ADMIN, Roles.SUPER_ADMIN, Roles.CO_ADMIN, Roles.DIRECTEUR_DFP)

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/justificatifs/*/fichier"
                                )
                                .hasAnyRole(
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.CHEF_DGAL,
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/justificatifs/*/validation"
                                )
                                .hasAnyRole(
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.CHEF_DGAL,
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )

                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/justificatifs/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )

                                .requestMatchers(
                                        "/api/justificatifs/**"
                                )
                                .authenticated()

                                // Aucun compte ni espace chauffeur : les fiches
                                // chauffeur restent des ressources gérées par la Logistique.
                                .requestMatchers("/api/chauffeur/**").denyAll()

                                // =========================================
                                // REGLE PAR DEFAUT
                                // =========================================

                                .anyRequest()
                                .authenticated()
                )

                // =================================================
                // PROVIDER
                // =================================================

                .authenticationProvider(
                        authenticationProvider()
                )

                // =================================================
                // JWT
                // =================================================

                .addFilterBefore(
                        jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}
