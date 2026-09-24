package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

/** Relevé GPS historique. Le temps GPS fait foi, pas l'heure de polling SPAT. */
@Entity
@Table(name = "gps_releves", indexes = {
        @Index(name = "idx_gps_releves_vehicule_date", columnList = "vehicule_id,date_gps")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_gps_releves_traceur_timestamp", columnNames = {"gps_device_id", "timestamp_gps"})
})
public class GpsReleve {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vehicule_id", nullable = false)
    private Long vehiculeId;

    @Column(name = "gps_device_id", nullable = false)
    private Long gpsDeviceId;

    @Column(name = "date_gps", nullable = false)
    private Instant dateGps;

    @Column(name = "timestamp_gps", nullable = false)
    private Long timestampGps;

    @Column(name = "latitude")
    private Double latitude;
    @Column(name = "longitude")
    private Double longitude;
    @Column(name = "vitesse")
    private Integer vitesse;
    @Column(name = "course")
    private Integer course;
    @Column(name = "altitude")
    private Double altitude;
    @Column(name = "odometre_km")
    private Double odometreKm;
    @Column(name = "distance_totale")
    private Double distanceTotale;

    public Long getId() { return id; }
    public Long getVehiculeId() { return vehiculeId; }
    public void setVehiculeId(Long vehiculeId) { this.vehiculeId = vehiculeId; }
    public Long getGpsDeviceId() { return gpsDeviceId; }
    public void setGpsDeviceId(Long gpsDeviceId) { this.gpsDeviceId = gpsDeviceId; }
    public Instant getDateGps() { return dateGps; }
    public void setDateGps(Instant dateGps) { this.dateGps = dateGps; }
    public Long getTimestampGps() { return timestampGps; }
    public void setTimestampGps(Long timestampGps) { this.timestampGps = timestampGps; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public Integer getVitesse() { return vitesse; }
    public void setVitesse(Integer vitesse) { this.vitesse = vitesse; }
    public Integer getCourse() { return course; }
    public void setCourse(Integer course) { this.course = course; }
    public Double getAltitude() { return altitude; }
    public void setAltitude(Double altitude) { this.altitude = altitude; }
    public Double getOdometreKm() { return odometreKm; }
    public void setOdometreKm(Double odometreKm) { this.odometreKm = odometreKm; }
    public Double getDistanceTotale() { return distanceTotale; }
    public void setDistanceTotale(Double distanceTotale) { this.distanceTotale = distanceTotale; }
}
