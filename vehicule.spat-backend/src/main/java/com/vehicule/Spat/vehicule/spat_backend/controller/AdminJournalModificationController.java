package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.JournalModificationResponse;
import com.vehicule.Spat.vehicule.spat_backend.model.JournalModification;
import com.vehicule.Spat.vehicule.spat_backend.repository.JournalModificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/modifications")
public class AdminJournalModificationController {

    private final JournalModificationRepository repository;

    public AdminJournalModificationController(JournalModificationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Page<JournalModificationResponse> lister(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int taille
    ) {
        int pageSecurisee = Math.max(0, page);
        int tailleSecurisee = Math.max(1, Math.min(taille, 100));
        Page<JournalModification> resultats = repository.findAllByOrderByDateActionDesc(
                PageRequest.of(pageSecurisee, tailleSecurisee, Sort.by(Sort.Direction.DESC, "dateAction"))
        );
        return resultats.map(item -> new JournalModificationResponse(
                item.getId(),
                item.getActeurMatricule(),
                item.getActeurRole(),
                item.getMethode(),
                item.getChemin(),
                item.getStatutHttp(),
                item.getDateAction()
        ));
    }
}
