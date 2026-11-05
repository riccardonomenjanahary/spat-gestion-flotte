package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.model.JournalModification;
import com.vehicule.Spat.vehicule.spat_backend.repository.JournalModificationRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Locale;

@Component
public class JournalModificationInterceptor implements HandlerInterceptor, WebMvcConfigurer {

    private static final Logger LOGGER = LoggerFactory.getLogger(JournalModificationInterceptor.class);

    private final JournalModificationRepository repository;

    public JournalModificationInterceptor(JournalModificationRepository repository) {
        this.repository = repository;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this).addPathPatterns("/api/**");
    }

    @Override
    public void afterCompletion(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception exception
    ) {
        String methode = request.getMethod().toUpperCase(Locale.ROOT);
        String chemin = request.getRequestURI();
        if (!estEcriture(methode)
                || !chemin.startsWith("/api/")
                || chemin.startsWith("/api/auth/")
                || response.getStatus() < 200
                || response.getStatus() >= 300
                || exception != null) {
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return;
        }

        String role = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_INCONNU")
                .replaceFirst("^ROLE_", "");

        JournalModification journal = new JournalModification();
        journal.setActeurMatricule(authentication.getName());
        journal.setActeurRole(role);
        journal.setMethode(methode);
        journal.setChemin(chemin.length() > 500 ? chemin.substring(0, 500) : chemin);
        journal.setStatutHttp(response.getStatus());

        try {
            repository.save(journal);
        } catch (RuntimeException erreur) {
            LOGGER.error("Impossible d'enregistrer la modification {} {} pour {}", methode, chemin, authentication.getName(), erreur);
        }
    }

    private boolean estEcriture(String methode) {
        return "POST".equals(methode)
                || "PUT".equals(methode)
                || "PATCH".equals(methode)
                || "DELETE".equals(methode);
    }
}
