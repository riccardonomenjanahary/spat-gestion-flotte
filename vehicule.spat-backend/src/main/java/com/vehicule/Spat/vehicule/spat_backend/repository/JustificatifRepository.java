package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Justificatif;
import com.vehicule.Spat.vehicule.spat_backend.model.TransactionCarburant;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JustificatifRepository extends JpaRepository<Justificatif, Long> {

    List<Justificatif> findByVehiculeOrderByDateDepotDesc(Vehicule vehicule);

    List<Justificatif> findByReservationOrderByDateDepotDesc(Reservation reservation);

    List<Justificatif> findByTransactionCarburantOrderByDateDepotDesc(TransactionCarburant transactionCarburant);

    List<Justificatif> findByValideFalse();
}
