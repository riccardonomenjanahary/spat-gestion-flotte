package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService;
import com.vehicule.Spat.vehicule.spat_backend.service.PersonnelDirectoryService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/personnels")
public class PersonnelDirectionController {
    private final AccesParcoursService acces;
    private final PersonnelDirectoryService personnel;
    public PersonnelDirectionController(AccesParcoursService acces, PersonnelDirectoryService personnel) {
        this.acces = acces; this.personnel = personnel;
    }
    @GetMapping("/ma-direction")
    public List<PersonnelDirectoryService.Personnel> lister() {
        var utilisateur = acces.courant();
        if (!AccesParcoursService.estAssistant(utilisateur)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return personnel.pourDirection(utilisateur.getDirectionId());
    }
}
