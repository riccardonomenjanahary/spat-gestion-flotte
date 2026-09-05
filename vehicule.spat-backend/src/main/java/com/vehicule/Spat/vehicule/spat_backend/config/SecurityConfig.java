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
                        csrf -> csrf.disable()
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

                                .requestMatchers(
                                        "/api/auth/**"
                                )
                                .permitAll()


                                // =========================================
                                // RESERVATIONS / MISSIONS
                                // =========================================

                                /*
                                 * VALIDATION NIVEAU 1
                                 *
                                 * Chef Service Logistique
                                 * + administrateurs.
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
                                 *
                                 * Chef DGAL
                                 * + administrateurs.
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
                                 * AVIS CHEF DIRECTION
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/reservations/*/avis-chef-direction"
                                )
                                .hasRole(
                                        Roles.CHEF_DIRECTION
                                )


                                /*
                                 * CREATION D'UNE DEMANDE
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/reservations"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.CHEF_DIRECTION
                                )


                                /*
                                 * CONSULTATION DES DEMANDES / MISSIONS
                                 *
                                 * IMPORTANT :
                                 * AGENT_FLOTTE ajouté ici.
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
                                        Roles.AGENT_FLOTTE
                                )


                                // =========================================
                                // MAINTENANCES
                                // =========================================

                                /*
                                 * AVIS TECHNIQUE DID
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/maintenances/*/avis"
                                )
                                .hasRole(
                                        Roles.MECANICIEN_DID
                                )


                                /*
                                 * LISTE SPECIFIQUE POUR LE MECANICIEN DID
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/maintenances/en-attente-avis"
                                )
                                .hasRole(
                                        Roles.MECANICIEN_DID
                                )


                                /*
                                 * CONSULTATION DES ENTRETIENS
                                 *
                                 * Agent Flotte peut suivre les dossiers.
                                 */
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


                                /*
                                 * CREATION D'UNE DEMANDE D'ENTRETIEN
                                 *
                                 * L'Agent Flotte peut créer le dossier.
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/maintenances",
                                        "/api/maintenances/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )


                                /*
                                 * MODIFICATION STATUT ENTRETIEN
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/maintenances/*/statut"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE
                                )


                                /*
                                 * PLANIFICATION ENTRETIEN
                                 */
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
                                // ASSURANCES / SINISTRES
                                // =========================================

                                /*
                                 * CONSULTATION
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/assurances/**",
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


                                /*
                                 * CREATION ASSURANCE
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/assurances/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )


                                /*
                                 * MODIFICATION ASSURANCE
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/assurances/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )


                                /*
                                 * SUPPRESSION ASSURANCE
                                 */
                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/assurances/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.CHEF_SERVICE_LOGISTIQUE,
                                        Roles.AGENT_FLOTTE
                                )


                                /*
                                 * CREATION SINISTRE
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/sinistres/**"
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

                                /*
                                 * CONSULTATION
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
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


                                /*
                                 * SAISIE CARBURANT
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
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

                                /*
                                 * CONSULTATION
                                 *
                                 * Directeur DFP peut consulter.
                                 */
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/admin/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN,
                                        Roles.DIRECTEUR_DFP
                                )


                                /*
                                 * CREATION
                                 */
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/admin/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )


                                /*
                                 * MODIFICATION
                                 */
                                .requestMatchers(
                                        HttpMethod.PUT,
                                        "/api/admin/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )


                                /*
                                 * SUPPRESSION
                                 */
                                .requestMatchers(
                                        HttpMethod.DELETE,
                                        "/api/admin/**"
                                )
                                .hasAnyRole(
                                        Roles.ADMIN,
                                        Roles.SUPER_ADMIN
                                )


                                // =========================================
                                // AUTRES ROUTES
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