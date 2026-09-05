package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.config.JwtUtil;
import com.vehicule.Spat.vehicule.spat_backend.dto.LoginRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.LoginResponse;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(
            UtilisateurRepository utilisateurRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil) {

        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request) {

        Utilisateur utilisateur = utilisateurRepository
                .findByMatricule(request.getNumMatricule())
                .orElse(null);

        if (utilisateur == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            Map.of(
                                    "message",
                                    "Matricule ou mot de passe incorrect"
                            )
                    );
        }

        if (!passwordEncoder.matches(
                request.getMotDePasse(),
                utilisateur.getMotDePasse())) {

            return ResponseEntity
                    .status(401)
                    .body(
                            Map.of(
                                    "message",
                                    "Matricule ou mot de passe incorrect"
                            )
                    );
        }

        if (!utilisateur.isActif()) {

            return ResponseEntity
                    .status(403)
                    .body(
                            Map.of(
                                    "message",
                                    "Votre compte est désactivé. Veuillez contacter l'administrateur."
                            )
                    );
        }

        String token = jwtUtil.genererToken(
                utilisateur.getMatricule(),
                utilisateur.getRole()
        );

        return ResponseEntity.ok(
                new LoginResponse(
                        token,
                        utilisateur.getRole(),
                        utilisateur.getMatricule()
                )
        );
    }
}