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
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

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
                        "http://localhost:3000"
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

                                // =========================================
                                // PREFLIGHT CORS
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.OPTIONS,
                                        "/**"
                                )
                                .permitAll()

                                // =========================================
                                // AUTHENTIFICATION
                                // =========================================

                                /*
                                 * Mot de passe oublié :
                                 * route publique car l'utilisateur n'a pas
                                 * encore de JWT lorsqu'il est sur /login.
                                 */
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

                                // =========================================
                                // GPS
                                // NE PAS MODIFIER
                                // =========================================

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/gps/positions",
                                        "/api/gps/positions/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.CHEF_DGAL,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
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
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )

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
                                        Roles.CHEF_SERVICE_LOGISTIQUE
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
                                        Roles.CHEF_DGAL
                                )

                                /*
                                 * AVIS CHEF DE DIRECTION
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/reservations/*/avis-chef-direction"
                                )
                                .hasRole(
                                        Roles.CHEF_DIRECTION
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
                                        Roles.ASSISTANT_DIRECTION
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
                                        Roles.CHEF_DGAL,
                                        Roles.AGENT_FLOTTE
                                )

                                /*
                                 * CONSULTATION DES RESERVATIONS
                                 */
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
                                        Roles.DIRECTEUR_DFP
                                )


                                // =========================================
                                // VEHICULE -> CHAUFFEUR ACTIF
                                // =========================================

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
                                // URGENCE DE DERNIERE MINUTE : AGENT FLOTTE UNIQUEMENT
                                // =========================================
                                .requestMatchers(HttpMethod.POST,
                                        "/api/agent-flotte/tickets/*/urgence-derniere-minute")
                                .hasRole(Roles.AGENT_FLOTTE)
                                .requestMatchers(HttpMethod.GET,
                                        "/api/agent-flotte/urgences-derniere-minute")
                                .hasRole(Roles.AGENT_FLOTTE)

                                // =========================================
                                // ESPACE CHAUFFEUR
                                // =========================================
                                // Seul le chauffeur connecte peut cloturer son ticket.
                                // Le controller verifie ensuite qu'il est affecte a la mission.
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/chauffeur/tickets/*/cloturer"
                                )
                                .hasRole(Roles.CHAUFFEUR)


                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/chauffeur/**"
                                )
                                .hasRole(
                                        Roles.CHAUFFEUR
                                )

                                .requestMatchers(HttpMethod.POST,
                                        "/api/chauffeur/signalements-entretien")
                                .hasRole(Roles.CHAUFFEUR)

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/chauffeur/consommations"
                                )
                                .hasRole(
                                        Roles.CHAUFFEUR
                                )

                                // =========================================
                                // MAINTENANCES
                                // =========================================

                                // Nouveau circuit d'entretien : chaque action est réservée à son rôle.
                                .requestMatchers(HttpMethod.POST,
                                        "/api/maintenances/demandes-entretien")
                                .hasRole(Roles.MECANICIEN_DID)

                                .requestMatchers(HttpMethod.PUT,
                                        "/api/maintenances/*/decision-entretien")
                                .hasRole(Roles.CHEF_SERVICE_LOGISTIQUE)

                                .requestMatchers(HttpMethod.PUT,
                                        "/api/maintenances/*/terminer-entretien")
                                .hasRole(Roles.MECANICIEN_DID)

                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/maintenances/*/avis-did"
                                )
                                .hasAnyRole(
                                        Roles.MECANICIEN_DID
                                )

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/maintenances/en-attente-avis"
                                )
                                .hasRole(
                                        Roles.MECANICIEN_DID
                                )

                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/maintenances",
                                        "/api/maintenances/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE,
                                        Roles.CHEF_DGAL,
                                        Roles.DIRECTEUR_DFP,
                                        Roles.MECANICIEN_DID
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
                                        Roles.DIRECTEUR_DFP
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
                                        Roles.DIRECTEUR_DFP
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
                                        Roles.DIRECTEUR_DFP
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
                                        Roles.DIRECTEUR_DFP
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
                                        "/api/admin/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.DIRECTEUR_DFP
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
                                        Roles.DIRECTEUR_DFP
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
