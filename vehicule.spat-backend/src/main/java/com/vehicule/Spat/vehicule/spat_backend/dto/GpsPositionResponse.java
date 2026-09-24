package com.vehicule.Spat.vehicule.spat_backend.dto;

// DTO existant : contrat de la carte en direct conservé.
public class GpsPositionResponse {
    private Long vehiculeId;
    private String immatriculation;
    private Long gpsDeviceId;
    private String nomGps;
    private Double latitude;
    private Double longitude;
    private Integer vitesse;
    private Integer course;
    private Double altitude;
    private String statutGps;
    private String dateGps;
    private Long timestampGps;
    private Double odometreKm;
    private Double distanceTotale;
    private Long derniereReceptionSpat;

    public GpsPositionResponse() { }

    public GpsPositionResponse(
            Long vehiculeId,
            String immatriculation,
            Long gpsDeviceId,
            String nomGps,
            Double latitude,
            Double longitude,
            Integer vitesse,
            Integer course,
            Double altitude,
            String statutGps,
            String dateGps,
            Long timestampGps,
            Double odometreKm,
            Double distanceTotale,
            Long derniereReceptionSpat
    ) {
        this.vehiculeId = vehiculeId;
        this.immatriculation = immatriculation;
        this.gpsDeviceId = gpsDeviceId;
        this.nomGps = nomGps;
        this.latitude = latitude;
        this.longitude = longitude;
        this.vitesse = vitesse;
        this.course = course;
        this.altitude = altitude;
        this.statutGps = statutGps;
        this.dateGps = dateGps;
        this.timestampGps = timestampGps;
        this.odometreKm = odometreKm;
        this.distanceTotale = distanceTotale;
        this.derniereReceptionSpat = derniereReceptionSpat;
    }

    public Long getVehiculeId() { return vehiculeId; }
    public void setVehiculeId(Long vehiculeId) { this.vehiculeId = vehiculeId; }
    public String getImmatriculation() { return immatriculation; }
    public void setImmatriculation(String immatriculation) { this.immatriculation = immatriculation; }
    public Long getGpsDeviceId() { return gpsDeviceId; }
    public void setGpsDeviceId(Long gpsDeviceId) { this.gpsDeviceId = gpsDeviceId; }
    public String getNomGps() { return nomGps; }
    public void setNomGps(String nomGps) { this.nomGps = nomGps; }
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
    public String getStatutGps() { return statutGps; }
    public void setStatutGps(String statutGps) { this.statutGps = statutGps; }
    public String getDateGps() { return dateGps; }
    public void setDateGps(String dateGps) { this.dateGps = dateGps; }
    public Long getTimestampGps() { return timestampGps; }
    public void setTimestampGps(Long timestampGps) { this.timestampGps = timestampGps; }
    public Double getOdometreKm() { return odometreKm; }
    public void setOdometreKm(Double odometreKm) { this.odometreKm = odometreKm; }
    public Double getDistanceTotale() { return distanceTotale; }
    public void setDistanceTotale(Double distanceTotale) { this.distanceTotale = distanceTotale; }
    public Long getDerniereReceptionSpat() { return derniereReceptionSpat; }
    public void setDerniereReceptionSpat(Long derniereReceptionSpat) { this.derniereReceptionSpat = derniereReceptionSpat; }
}
