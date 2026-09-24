package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.dto.GpsHistoriqueResponse;
import com.vehicule.Spat.vehicule.spat_backend.dto.GpsPositionResponse;
import com.vehicule.Spat.vehicule.spat_backend.dto.GpsReleveHistoriqueResponse;
import com.vehicule.Spat.vehicule.spat_backend.model.GpsReleve;
import com.vehicule.Spat.vehicule.spat_backend.repository.GpsReleveRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class GpsHistoriqueService {

    private final GpsReleveRepository repository;
    private final ZoneId fuseau;
    private final String uniteDistanceTotale;

    public GpsHistoriqueService(
            GpsReleveRepository repository,
            @Value("${gps.time-zone:Indian/Antananarivo}") String fuseau,
            @Value("${gps.total-distance-unit:UNSPECIFIED}") String uniteDistanceTotale) {
        this.repository = repository;
        this.fuseau = ZoneId.of(fuseau);
        this.uniteDistanceTotale = uniteDistanceTotale.trim().toUpperCase();
    }

    /** Conserve un point par (traceur, timestamp GPS), sans doublonner chaque polling. */
    @Transactional
    public void enregistrerSiNouveau(GpsPositionResponse position) {
        if (position == null || position.getGpsDeviceId() == null
                || position.getVehiculeId() == null) return;

        Instant instant = dateGpsReelle(position);
        if (instant == null) return; // Ne jamais inventer une heure GPS.

        long secondes = instant.getEpochSecond();
        if (repository.existsByGpsDeviceIdAndTimestampGps(position.getGpsDeviceId(), secondes)) {
            return;
        }

        GpsReleve releve = new GpsReleve();
        releve.setVehiculeId(position.getVehiculeId());
        releve.setGpsDeviceId(position.getGpsDeviceId());
        releve.setDateGps(instant);
        releve.setTimestampGps(secondes);
        releve.setLatitude(position.getLatitude());
        releve.setLongitude(position.getLongitude());
        releve.setVitesse(position.getVitesse());
        releve.setCourse(position.getCourse());
        releve.setAltitude(position.getAltitude());
        releve.setOdometreKm(position.getOdometreKm());
        releve.setDistanceTotale(position.getDistanceTotale());
        repository.save(releve);
    }

    /** Journée civile locale [00:00 ; 00:00 lendemain), avec tri chronologique. */
    @Transactional(readOnly = true)
    public GpsHistoriqueResponse obtenirHistorique(Long vehiculeId, LocalDate date) {
        if (vehiculeId == null || vehiculeId <= 0 || date == null) {
            throw new IllegalArgumentException("vehiculeId et date sont obligatoires.");
        }
        Instant debut = date.atStartOfDay(fuseau).toInstant();
        Instant fin = date.plusDays(1).atStartOfDay(fuseau).toInstant();
        List<GpsReleve> historiques = repository
                .findByVehiculeIdAndDateGpsGreaterThanEqualAndDateGpsLessThanOrderByDateGpsAscIdAsc(
                        vehiculeId, debut, fin);

        List<GpsReleveHistoriqueResponse> positions = historiques.stream()
                .map(p -> new GpsReleveHistoriqueResponse(
                        p.getId(), p.getVehiculeId(), p.getGpsDeviceId(),
                        p.getDateGps().toString(), p.getTimestampGps(),
                        p.getLatitude(), p.getLongitude(), p.getVitesse(),
                        p.getAltitude(), p.getCourse(), p.getOdometreKm(),
                        p.getDistanceTotale()))
                .toList();

        // La distance est celle OBSERVÉE entre le premier et le dernier relevé
        // du jour. Elle ne prétend pas reconstruire les trajets avant le début
        // de l'enregistrement ni durant une panne du traceur.
        Double distanceJourKm = calculerDistanceObservee(historiques);
        return new GpsHistoriqueResponse(vehiculeId, date.toString(), positions, distanceJourKm);
    }

    private Instant dateGpsReelle(GpsPositionResponse position) {
        Long timestamp = position.getTimestampGps();
        if (timestamp != null && timestamp > 0) {
            try {
                Instant instant = timestamp >= 100_000_000_000L
                        ? Instant.ofEpochMilli(timestamp)
                        : Instant.ofEpochSecond(timestamp);
                return datePlausible(instant) ? instant : null;
            } catch (RuntimeException e) {
                return null;
            }
        }
        String date = position.getDateGps();
        if (date == null || date.isBlank()) return null;
        try {
            Instant instant = Instant.parse(date);
            return datePlausible(instant) ? instant : null;
        } catch (DateTimeParseException ignore) {
            try {
                Instant instant = LocalDateTime.parse(date,
                                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                        .atZone(fuseau).toInstant();
                return datePlausible(instant) ? instant : null;
            } catch (DateTimeParseException ignore2) {
                return null;
            }
        }
    }

    private boolean datePlausible(Instant t) {
        return t.isAfter(Instant.parse("2000-01-01T00:00:00Z"))
                && t.isBefore(Instant.now().plusSeconds(3600));
    }

    private Double calculerDistanceObservee(List<GpsReleve> releves) {
        // total_distance côté fournisseur est parfois en mètres, parfois en km.
        // On n'applique AUCUNE conversion sans choix explicite dans la config.
        boolean enMetres = "METERS".equals(uniteDistanceTotale);
        boolean enKm = "KILOMETERS".equals(uniteDistanceTotale);
        if (!enMetres && !enKm) return null;

        Double precedent = null;
        double total = 0;
        int segmentsValides = 0;
        for (GpsReleve releve : releves) {
            Double valeur = releve.getDistanceTotale();
            if (valeur == null || !Double.isFinite(valeur) || valeur < 0) continue;
            double enKmCourant = enMetres ? valeur / 1000.0 : valeur;
            if (precedent != null) {
                double ecart = enKmCourant - precedent;
                // Remise à zéro ou saut anormal du compteur : ne pas l'ajouter.
                if (ecart >= 0 && ecart <= 1500) {
                    total += ecart;
                    segmentsValides++;
                }
            }
            precedent = enKmCourant;
        }
        return segmentsValides == 0 ? null : Math.round(total * 1000.0) / 1000.0;
    }
}

