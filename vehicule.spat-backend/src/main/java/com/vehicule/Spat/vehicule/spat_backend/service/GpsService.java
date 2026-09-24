package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.dto.GpsPositionResponse;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import org.springframework.dao.DataIntegrityViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GpsService {

    private static final Logger logger =
            LoggerFactory.getLogger(GpsService.class);

    private static final Pattern TOKEN_INPUT_PATTERN = Pattern.compile(
            "<input[^>]+name=[\"']_token[\"'][^>]+value=[\"']([^\"']+)[\"']",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern TOKEN_INPUT_REVERSE_PATTERN = Pattern.compile(
            "<input[^>]+value=[\"']([^\"']+)[\"'][^>]+name=[\"']_token[\"']",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern TOKEN_META_PATTERN = Pattern.compile(
            "<meta[^>]+name=[\"']csrf-token[\"'][^>]+content=[\"']([^\"']+)[\"']",
            Pattern.CASE_INSENSITIVE
    );

    private final VehiculeRepository vehiculeRepository;
    private final GpsHistoriqueService gpsHistoriqueService;
    private final RestClient restClient;
    private final HttpClient authHttpClient;
    private final CookieManager cookieManager;

    private final boolean gpsEnabled;
    private final String gpsBaseUrl;
    private final String itemsPath;
    private final String itemsJsonPath;

    private final String gpsIdentifier;
    private final String gpsPassword;

    private volatile String sessionCookie = "";
    private volatile String csrfToken = "";

    private final Map<Long, GpsPositionResponse> positions =
            new ConcurrentHashMap<>();

    private final Map<Long, VehiculeReference> vehiculesGps =
            new ConcurrentHashMap<>();

    private final AtomicLong dernierTempsServeur =
            new AtomicLong(0);

    public GpsService(
            VehiculeRepository vehiculeRepository,
            GpsHistoriqueService gpsHistoriqueService,

            @Value("${gps.enabled:true}")
            boolean gpsEnabled,

            @Value("${gps.base-url}")
            String gpsBaseUrl,

            @Value("${gps.items-path:/objects/items}")
            String itemsPath,

            @Value("${gps.items-json-path:/objects/items_json}")
            String itemsJsonPath,

            @Value("${gps.identifier:}")
            String gpsIdentifier,

            @Value("${gps.password:}")
            String gpsPassword
    ) {

        this.vehiculeRepository = vehiculeRepository;
        this.gpsHistoriqueService = gpsHistoriqueService;

        this.gpsEnabled = gpsEnabled;
        this.gpsBaseUrl = supprimerSlashFinal(gpsBaseUrl);
        this.itemsPath = itemsPath;
        this.itemsJsonPath = itemsJsonPath;

        this.gpsIdentifier = gpsIdentifier;
        this.gpsPassword = gpsPassword;

        this.cookieManager =
                new CookieManager(
                        null,
                        CookiePolicy.ACCEPT_ALL
                );

        this.restClient =
                RestClient.builder()
                        .baseUrl(this.gpsBaseUrl)
                        .defaultHeader(
                                HttpHeaders.ACCEPT,
                                "application/json, text/javascript, */*; q=0.01"
                        )
                        .defaultHeader(
                                "X-Requested-With",
                                "XMLHttpRequest"
                        )
                        .defaultHeader(
                                HttpHeaders.USER_AGENT,
                                "SPAT-Gestion-Flotte/1.0"
                        )
                        .build();

        this.authHttpClient =
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(15))
                        .followRedirects(HttpClient.Redirect.NORMAL)
                        .cookieHandler(cookieManager)
                        .build();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initialiserGps() {

        if (!gpsEnabled) {
            logger.info("GPS désactivé dans la configuration.");
            return;
        }

        if (!identifiantsConfigures()) {
            logger.warn(
                    "GPS non initialisé : gps.identifier ou gps.password absent."
            );
            return;
        }

        chargerCorrespondancesVehicules();

        logger.info(
                "{} véhicule(s) équipé(s) GPS trouvé(s).",
                vehiculesGps.size()
        );

        if (vehiculesGps.isEmpty()) {
            logger.warn(
                    "Aucun véhicule équipé GPS avec un gpsDeviceId valide."
            );
            return;
        }

        if (!authentifier()) {
            logger.error(
                    "Initialisation GPS interrompue : authentification gps-gps.online impossible."
            );
            return;
        }

        chargerPositionsInitiales();

        dernierTempsServeur.set(
                Instant.now().getEpochSecond() - 30
        );

        rafraichirPositions();

        logger.info(
                "Initialisation GPS terminée : {} position(s) en mémoire.",
                positions.size()
        );
    }

    private synchronized boolean authentifier() {

        if (!identifiantsConfigures()) {
            logger.error(
                    "Authentification GPS impossible : identifiants absents."
            );
            return false;
        }

        try {

            String urlCreation =
                    gpsBaseUrl + "/authentication/create";

            logger.info(
                    "Authentification automatique auprès de gps-gps.online..."
            );

            cookieManager.getCookieStore().removeAll();

            sessionCookie = "";
            csrfToken = "";

            HttpRequest getForm =
                    HttpRequest.newBuilder()
                            .uri(URI.create(urlCreation))
                            .timeout(Duration.ofSeconds(15))
                            .header(
                                    "Accept",
                                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                            )
                            .header(
                                    "User-Agent",
                                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                            + "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36"
                            )
                            .GET()
                            .build();

            HttpResponse<String> formResponse =
                    authHttpClient.send(
                            getForm,
                            HttpResponse.BodyHandlers.ofString(
                                    StandardCharsets.UTF_8
                            )
                    );

            if (
                    formResponse.statusCode() < 200
                            || formResponse.statusCode() >= 400
            ) {

                logger.error(
                        "Impossible de charger le formulaire GPS. HTTP {}",
                        formResponse.statusCode()
                );

                return false;
            }

            String token =
                    extraireTokenCsrf(formResponse.body());

            if (token == null || token.isBlank()) {

                logger.error(
                        "Token CSRF introuvable dans /authentication/create."
                );

                return false;
            }

            csrfToken = token;

            String formulaire =
                    "_token=" + encoder(token)
                            + "&identifier=" + encoder(gpsIdentifier)
                            + "&password=" + encoder(gpsPassword)
                            + "&remember_me=1"
                            + "&Submit=" + encoder("Submit");

            HttpRequest postLogin =
                    HttpRequest.newBuilder()
                            .uri(
                                    URI.create(
                                            gpsBaseUrl
                                                    + "/authentication/store"
                                    )
                            )
                            .timeout(Duration.ofSeconds(15))
                            .header(
                                    "Content-Type",
                                    "application/x-www-form-urlencoded"
                            )
                            .header(
                                    "Accept",
                                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                            )
                            .header(
                                    "Referer",
                                    urlCreation
                            )
                            .header(
                                    "Origin",
                                    gpsBaseUrl
                            )
                            .header(
                                    "User-Agent",
                                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                            + "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36"
                            )
                            .header(
                                    "X-CSRF-TOKEN",
                                    token
                            )
                            .header(
                                    "X-Requested-With",
                                    "XMLHttpRequest"
                            )
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            formulaire,
                                            StandardCharsets.UTF_8
                                    )
                            )
                            .build();

            HttpResponse<String> loginResponse =
                    authHttpClient.send(
                            postLogin,
                            HttpResponse.BodyHandlers.ofString(
                                    StandardCharsets.UTF_8
                            )
                    );

            int status =
                    loginResponse.statusCode();

            if (
                    status < 200
                            || status >= 400
            ) {

                logger.error(
                        "Authentification GPS refusée. HTTP {}",
                        status
                );

                return false;
            }

            sessionCookie =
                    construireCookieHeaderDepuisCookieStore();

            if (sessionCookie.isBlank()) {

                logger.error(
                        "Authentification GPS : aucun cookie de session exploitable après connexion. HTTP {}",
                        status
                );

                return false;
            }

            logger.info(
                    "Authentification automatique gps-gps.online réussie."
            );

            logger.debug(
                    "Session GPS établie avec {} cookie(s).",
                    compterCookiesSession()
            );

            return true;

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            logger.error(
                    "Authentification GPS interrompue.",
                    e
            );

            return false;

        } catch (Exception e) {

            logger.error(
                    "Erreur pendant l'authentification automatique GPS : {}",
                    e.getMessage(),
                    e
            );

            return false;
        }
    }

    private String extraireTokenCsrf(String html) {

        Matcher matcher =
                TOKEN_INPUT_PATTERN.matcher(html);

        if (matcher.find()) {
            return matcher.group(1);
        }

        matcher =
                TOKEN_INPUT_REVERSE_PATTERN.matcher(html);

        if (matcher.find()) {
            return matcher.group(1);
        }

        matcher =
                TOKEN_META_PATTERN.matcher(html);

        if (matcher.find()) {
            return matcher.group(1);
        }

        return null;
    }

    private String construireCookieHeaderDepuisCookieStore() {

        List<HttpCookie> cookies =
                cookieManager
                        .getCookieStore()
                        .getCookies();

        if (cookies == null || cookies.isEmpty()) {
            return "";
        }

        List<String> valeurs =
                new ArrayList<>();

        for (HttpCookie cookie : cookies) {

            if (cookie == null) {
                continue;
            }

            if (cookie.hasExpired()) {
                continue;
            }

            String nom =
                    cookie.getName();

            String valeur =
                    cookie.getValue();

            if (
                    nom == null
                            || nom.isBlank()
            ) {
                continue;
            }

            if (valeur == null) {
                valeur = "";
            }

            valeurs.add(
                    nom + "=" + valeur
            );
        }

        return String.join(
                "; ",
                valeurs
        );
    }

    private String construireCookieHeader(
            List<String> setCookies
    ) {

        if (setCookies == null || setCookies.isEmpty()) {
            return "";
        }

        List<String> cookies =
                new ArrayList<>();

        for (String setCookie : setCookies) {

            if (setCookie == null || setCookie.isBlank()) {
                continue;
            }

            int separateur =
                    setCookie.indexOf(';');

            String cookie =
                    separateur >= 0
                            ? setCookie.substring(0, separateur)
                            : setCookie;

            if (!cookie.isBlank()) {
                cookies.add(cookie);
            }
        }

        return String.join("; ", cookies);
    }

    private int compterCookiesSession() {

        int compteur = 0;

        for (
                HttpCookie cookie
                : cookieManager
                .getCookieStore()
                .getCookies()
        ) {

            if (
                    cookie != null
                            && !cookie.hasExpired()
            ) {
                compteur++;
            }
        }

        return compteur;
    }

    private boolean identifiantsConfigures() {

        return gpsIdentifier != null
                && !gpsIdentifier.isBlank()
                && gpsPassword != null
                && !gpsPassword.isBlank();
    }

    private boolean sessionActive() {

        return sessionCookie != null
                && !sessionCookie.isBlank();
    }

    private void chargerCorrespondancesVehicules() {

        vehiculesGps.clear();

        List<Vehicule> vehicules =
                vehiculeRepository.findAll();

        for (Vehicule vehicule : vehicules) {

            if (
                    Boolean.TRUE.equals(
                            vehicule.getGpsEquipe()
                    )
                            &&
                            vehicule.getGpsDeviceId() != null
            ) {

                vehiculesGps.put(
                        vehicule.getGpsDeviceId(),
                        new VehiculeReference(
                                vehicule.getId(),
                                vehicule.getImmatriculation()
                        )
                );
            }
        }
    }

    private void chargerPositionsInitiales() {

        for (
                Map.Entry<Long, VehiculeReference> entry
                : vehiculesGps.entrySet()
        ) {

            Long gpsDeviceId =
                    entry.getKey();

            try {

                Map<String, Object> reponse =
                        appelerPositionComplete(
                                gpsDeviceId
                        );

                traiterReponsePositionInitiale(reponse);

            } catch (RestClientResponseException e) {

                if (estErreurAuthentification(e)) {

                    logger.warn(
                            "Session GPS refusée lors du chargement du traceur {} (HTTP {}). Réauthentification...",
                            gpsDeviceId,
                            e.getStatusCode().value()
                    );

                    if (authentifier()) {

                        try {

                            Map<String, Object> reponse =
                                    appelerPositionComplete(
                                            gpsDeviceId
                                    );

                            traiterReponsePositionInitiale(
                                    reponse
                            );

                        } catch (Exception retryException) {

                            logger.error(
                                    "Impossible de charger la position GPS initiale du traceur {} après réauthentification : {}",
                                    gpsDeviceId,
                                    retryException.getMessage()
                            );
                        }
                    }

                } else {

                    logger.error(
                            "Impossible de charger la position GPS initiale du traceur {} : {}",
                            gpsDeviceId,
                            e.getMessage()
                    );
                }

            } catch (Exception e) {

                logger.error(
                        "Impossible de charger la position GPS initiale du traceur {} : {}",
                        gpsDeviceId,
                        e.getMessage()
                );
            }
        }
    }

    private void traiterReponsePositionInitiale(
            Map<String, Object> reponse
    ) {

        if (reponse == null) {
            return;
        }

        Object dataObject =
                reponse.get("data");

        if (!(dataObject instanceof List<?> data)) {
            return;
        }

        for (Object itemObject : data) {

            if (itemObject instanceof Map<?, ?> map) {

                @SuppressWarnings("unchecked")
                Map<String, Object> item =
                        (Map<String, Object>) map;

                appliquerDonneeGps(item);
            }
        }
    }

    public synchronized void rafraichirPositions() {

        if (!gpsEnabled) {
            return;
        }

        if (!sessionActive()) {

            if (!authentifier()) {
                return;
            }
        }

        long temps =
                dernierTempsServeur.get();

        if (temps <= 0) {

            temps =
                    Instant.now()
                            .getEpochSecond()
                            - 30;
        }

        try {

            Map<String, Object> reponse =
                    appelerMisesAJour(temps);

            traiterMisesAJour(reponse);

        } catch (RestClientResponseException e) {

            if (estErreurAuthentification(e)) {

                logger.warn(
                        "Session GPS refusée (HTTP {}). Réauthentification automatique...",
                        e.getStatusCode().value()
                );

                if (authentifier()) {

                    try {

                        Map<String, Object> reponse =
                                appelerMisesAJour(
                                        dernierTempsServeur.get()
                                );

                        traiterMisesAJour(reponse);

                        logger.info(
                                "Synchronisation GPS reprise après réauthentification."
                        );

                    } catch (RestClientResponseException retryException) {

                        logger.error(
                                "Erreur GPS après réauthentification : HTTP {}",
                                retryException.getStatusCode().value()
                        );

                    } catch (RestClientException retryException) {

                        logger.error(
                                "Serveur GPS inaccessible après réauthentification : {}",
                                retryException.getMessage()
                        );
                    }
                }

            } else {

                logger.error(
                        "Erreur HTTP GPS {} : {}",
                        e.getStatusCode().value(),
                        e.getMessage()
                );
            }

        } catch (RestClientException e) {

            logger.error(
                    "Serveur GPS inaccessible : {}",
                    e.getMessage()
            );

        } catch (Exception e) {

            logger.error(
                    "Erreur pendant la synchronisation GPS : {}",
                    e.getMessage()
            );
        }
    }

    private void traiterMisesAJour(
            Map<String, Object> reponse
    ) {

        if (reponse == null) {
            return;
        }

        Long nouveauTemps =
                convertirLong(
                        reponse.get("time")
                );

        if (
                nouveauTemps != null
                        &&
                        nouveauTemps > 0
        ) {

            dernierTempsServeur.set(
                    nouveauTemps
            );
        }

        Object itemsObject =
                reponse.get("items");

        if (!(itemsObject instanceof Map<?, ?> items)) {
            return;
        }

        Object dataObject =
                items.get("data");

        if (!(dataObject instanceof List<?> data)) {
            return;
        }

        int nombreMisesAJour = 0;

        for (Object itemObject : data) {

            if (itemObject instanceof Map<?, ?> map) {

                @SuppressWarnings("unchecked")
                Map<String, Object> item =
                        (Map<String, Object>) map;

                if (appliquerDonneeGps(item)) {
                    nombreMisesAJour++;
                }
            }
        }

        if (nombreMisesAJour > 0) {

            logger.info(
                    "{} position(s) GPS mise(s) à jour.",
                    nombreMisesAJour
            );
        }
    }

    private Map<String, Object> appelerPositionComplete(
            Long gpsDeviceId
    ) {

        return restClient
                .get()
                .uri(uriBuilder ->
                        uriBuilder
                                .path(itemsPath)
                                .queryParam(
                                        "id",
                                        gpsDeviceId
                                )
                                .queryParam(
                                        "full",
                                        true
                                )
                                .queryParam(
                                        "_",
                                        System.currentTimeMillis()
                                )
                                .build()
                )
                .headers(this::ajouterHeadersAuthentification)
                .retrieve()
                .body(Map.class);
    }

    private Map<String, Object> appelerMisesAJour(
            long temps
    ) {

        return restClient
                .get()
                .uri(uriBuilder ->
                        uriBuilder
                                .path(itemsJsonPath)
                                .queryParam(
                                        "time",
                                        temps
                                )
                                .queryParam(
                                        "_",
                                        System.currentTimeMillis()
                                )
                                .build()
                )
                .headers(this::ajouterHeadersAuthentification)
                .retrieve()
                .body(Map.class);
    }

    private void ajouterHeadersAuthentification(
            HttpHeaders headers
    ) {

        String cookies =
                construireCookieHeaderDepuisCookieStore();

        if (!cookies.isBlank()) {

            sessionCookie = cookies;

            headers.set(
                    HttpHeaders.COOKIE,
                    cookies
            );
        }

        if (
                csrfToken != null
                        &&
                        !csrfToken.isBlank()
        ) {

            headers.set(
                    "X-CSRF-TOKEN",
                    csrfToken
            );
        }

        headers.set(
                "X-Requested-With",
                "XMLHttpRequest"
        );

        headers.set(
                HttpHeaders.ACCEPT,
                "application/json, text/javascript, */*; q=0.01"
        );

        headers.set(
                HttpHeaders.REFERER,
                gpsBaseUrl + "/objects"
        );

        headers.set(
                HttpHeaders.USER_AGENT,
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        + "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36"
        );
    }

    private boolean appliquerDonneeGps(
            Map<String, Object> item
    ) {

        Long gpsDeviceId =
                convertirLong(
                        item.get("id")
                );

        if (gpsDeviceId == null) {
            return false;
        }

        VehiculeReference vehicule =
                vehiculesGps.get(
                        gpsDeviceId
                );

        if (vehicule == null) {
            return false;
        }

        GpsPositionResponse precedente =
                positions.get(
                        gpsDeviceId
                );

        String nomGps =
                valeurString(
                        item.get("name"),
                        precedente != null
                                ? precedente.getNomGps()
                                : null
                );

        Double latitude =
                valeurDouble(
                        item.get("lat"),
                        precedente != null
                                ? precedente.getLatitude()
                                : null
                );

        Double longitude =
                valeurDouble(
                        item.get("lng"),
                        precedente != null
                                ? precedente.getLongitude()
                                : null
                );

        Integer vitesse =
                valeurInteger(
                        item.get("speed"),
                        precedente != null
                                ? precedente.getVitesse()
                                : 0
                );

        Integer course =
                valeurInteger(
                        item.get("course"),
                        precedente != null
                                ? precedente.getCourse()
                                : null
                );

        Double altitude =
                valeurDouble(
                        item.get("altitude"),
                        precedente != null
                                ? precedente.getAltitude()
                                : null
                );

        String statutGps =
                valeurString(
                        item.get("online"),
                        precedente != null
                                ? precedente.getStatutGps()
                                : null
                );

        String dateGps =
                valeurString(
                        item.get("time"),
                        precedente != null
                                ? precedente.getDateGps()
                                : null
                );

        Long timestampGps =
                valeurLong(
                        item.get("timestamp"),
                        precedente != null
                                ? precedente.getTimestampGps()
                                : null
                );

        Double distanceTotale =
                valeurDouble(
                        item.get("total_distance"),
                        precedente != null
                                ? precedente.getDistanceTotale()
                                : null
                );

        Double odometre =
                extraireOdometre(
                        item.get("sensors")
                );

        if (
                odometre == null
                        &&
                        precedente != null
        ) {

            odometre =
                    precedente.getOdometreKm();
        }

        GpsPositionResponse nouvellePosition =
                new GpsPositionResponse(

                        vehicule.vehiculeId(),
                        vehicule.immatriculation(),

                        gpsDeviceId,
                        nomGps,

                        latitude,
                        longitude,

                        vitesse,
                        course,

                        altitude,

                        statutGps,

                        dateGps,
                        timestampGps,

                        odometre,
                        distanceTotale,

                        System.currentTimeMillis()
                );

        positions.put(
                gpsDeviceId,
                nouvellePosition
        );

        // Conservation du relevé dès sa réception. La carte en direct reste
        // opérationnelle même si l'écriture de l'historique échoue.
        try {
            gpsHistoriqueService.enregistrerSiNouveau(nouvellePosition);
        } catch (DataIntegrityViolationException conflit) {
            // Une contrainte unique protège aussi des synchronisations simultanées.
            logger.debug("Relevé GPS déjà conservé pour le traceur {}.", gpsDeviceId);
        } catch (Exception e) {
            logger.error("Historique GPS non enregistré pour le traceur {} : {}",
                    gpsDeviceId, e.getMessage(), e);
        }

        return true;
    }

    private Double extraireOdometre(
            Object sensorsObject
    ) {

        if (!(sensorsObject instanceof List<?> sensors)) {
            return null;
        }

        for (Object sensorObject : sensors) {

            if (!(sensorObject instanceof Map<?, ?> sensor)) {
                continue;
            }

            Object typeObject =
                    sensor.get("type");

            if (
                    typeObject == null
                            ||
                            !"odometer".equalsIgnoreCase(
                                    typeObject.toString()
                            )
            ) {
                continue;
            }

            Double valeur =
                    convertirDouble(
                            sensor.get("val")
                    );

            if (valeur != null) {
                return valeur;
            }

            Object valueObject =
                    sensor.get("value");

            if (valueObject != null) {

                String texte =
                        valueObject
                                .toString()
                                .replace("km", "")
                                .trim();

                try {

                    return Double.parseDouble(
                            texte
                    );

                } catch (
                        NumberFormatException ignored
                ) {
                }
            }
        }

        return null;
    }

    public List<GpsPositionResponse> getPositions() {

        List<GpsPositionResponse> resultat =
                new ArrayList<>(
                        positions.values()
                );

        resultat.sort(
                Comparator.comparing(
                        GpsPositionResponse::getImmatriculation,
                        String.CASE_INSENSITIVE_ORDER
                )
        );

        return resultat;
    }

    public GpsPositionResponse getPositionParDeviceId(
            Long gpsDeviceId
    ) {

        return positions.get(
                gpsDeviceId
        );
    }

    private boolean estErreurAuthentification(
            RestClientResponseException e
    ) {

        int status =
                e.getStatusCode().value();

        return status == 401
                || status == 403
                || status == 419;
    }

    private static String encoder(
            String valeur
    ) {

        return URLEncoder
                .encode(
                        valeur == null
                                ? ""
                                : valeur,
                        StandardCharsets.UTF_8
                );
    }

    private static String supprimerSlashFinal(
            String valeur
    ) {

        if (valeur == null) {
            return "";
        }

        while (valeur.endsWith("/")) {

            valeur =
                    valeur.substring(
                            0,
                            valeur.length() - 1
                    );
        }

        return valeur;
    }

    private Long convertirLong(
            Object valeur
    ) {

        if (valeur == null) {
            return null;
        }

        if (valeur instanceof Number number) {
            return number.longValue();
        }

        try {

            return Long.parseLong(
                    valeur.toString()
            );

        } catch (NumberFormatException e) {

            return null;
        }
    }

    private Double convertirDouble(
            Object valeur
    ) {

        if (valeur == null) {
            return null;
        }

        if (valeur instanceof Number number) {
            return number.doubleValue();
        }

        try {

            return Double.parseDouble(
                    valeur.toString()
            );

        } catch (NumberFormatException e) {

            return null;
        }
    }

    private Integer convertirInteger(
            Object valeur
    ) {

        if (valeur == null) {
            return null;
        }

        if (valeur instanceof Number number) {
            return number.intValue();
        }

        try {

            return Integer.parseInt(
                    valeur.toString()
            );

        } catch (NumberFormatException e) {

            return null;
        }
    }

    private String valeurString(
            Object valeur,
            String valeurPrecedente
    ) {

        if (valeur == null) {
            return valeurPrecedente;
        }

        return valeur.toString();
    }

    private Double valeurDouble(
            Object valeur,
            Double valeurPrecedente
    ) {

        Double resultat =
                convertirDouble(valeur);

        return resultat != null
                ? resultat
                : valeurPrecedente;
    }

    private Integer valeurInteger(
            Object valeur,
            Integer valeurPrecedente
    ) {

        Integer resultat =
                convertirInteger(valeur);

        return resultat != null
                ? resultat
                : valeurPrecedente;
    }

    private Long valeurLong(
            Object valeur,
            Long valeurPrecedente
    ) {

        Long resultat =
                convertirLong(valeur);

        return resultat != null
                ? resultat
                : valeurPrecedente;
    }

    private record VehiculeReference(
            Long vehiculeId,
            String immatriculation
    ) {
    }
}
