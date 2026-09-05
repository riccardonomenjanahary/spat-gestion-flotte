 package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.TransactionCarburant;
import com.vehicule.Spat.vehicule.spat_backend.repository.TransactionCarburantRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/carburant")
public class TransactionCarburantController {

    private final TransactionCarburantRepository transactionCarburantRepository;

    public TransactionCarburantController(
            TransactionCarburantRepository transactionCarburantRepository) {

        this.transactionCarburantRepository = transactionCarburantRepository;
    }

    @GetMapping
    public List<TransactionCarburant> lister() {
        return transactionCarburantRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> creer(
            @RequestBody TransactionCarburant transaction) {

        return ResponseEntity.ok(
                transactionCarburantRepository.save(transaction)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> supprimer(@PathVariable UUID id) {

        if (!transactionCarburantRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        transactionCarburantRepository.deleteById(id);

        return ResponseEntity.ok().build();
    }
}