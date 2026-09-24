package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Methodes existantes : conservees pour la cloche de notifications.
    List<Notification> findTop50ByDestinataireMatriculeOrderByDateCreationDesc(String destinataireMatricule);
    List<Notification> findTop50ByDestinataireMatriculeAndLuFalseOrderByDateCreationDesc(String destinataireMatricule);
    long countByDestinataireMatriculeAndLuFalse(String destinataireMatricule);
    Optional<Notification> findByIdAndDestinataireMatricule(Long id, String destinataireMatricule);

    // Seules les notifications effectivement COMMITTEES sont visibles par ce traitement.
    @Query("""
            select n.id from Notification n
            where n.emailEnvoye = false
              and n.statutEmail in ('A_ENVOYER', 'ECHEC')
              and coalesce(n.tentativesEmail, 0) < :maxTentatives
              and (n.prochaineTentativeEmail is null or n.prochaineTentativeEmail <= :maintenant)
            order by n.dateCreation asc, n.id asc
            """)
    List<Long> trouverIdsEmailsATraiter(@Param("maintenant") LocalDateTime maintenant,
                                        @Param("maxTentatives") int maxTentatives,
                                        Pageable pagination);

    // Claim atomique : deux instances du backend ne doivent pas traiter le meme ID simultanement.
    @Modifying
    @Transactional
    @Query("""
            update Notification n
               set n.statutEmail = 'EN_COURS',
                   n.tentativesEmail = coalesce(n.tentativesEmail, 0) + 1,
                   n.dateDernierEssaiEmail = :maintenant,
                   n.prochaineTentativeEmail = null
             where n.id = :id
               and n.emailEnvoye = false
               and n.statutEmail in ('A_ENVOYER', 'ECHEC')
               and coalesce(n.tentativesEmail, 0) < :maxTentatives
               and (n.prochaineTentativeEmail is null or n.prochaineTentativeEmail <= :maintenant)
            """)
    int reserverEmail(@Param("id") Long id,
                      @Param("maintenant") LocalDateTime maintenant,
                      @Param("maxTentatives") int maxTentatives);

    @Modifying
    @Transactional
    @Query("""
            update Notification n
               set n.emailEnvoye = true, n.statutEmail = 'ENVOYE',
                   n.dateEmail = :maintenant, n.erreurEmail = null,
                   n.prochaineTentativeEmail = null
             where n.id = :id and n.statutEmail = 'EN_COURS'
            """)
    int confirmerEmailEnvoye(@Param("id") Long id,
                             @Param("maintenant") LocalDateTime maintenant);

    @Modifying
    @Transactional
    @Query("""
            update Notification n
               set n.emailEnvoye = false, n.statutEmail = :statut,
                   n.erreurEmail = :erreur,
                   n.prochaineTentativeEmail = :prochaineTentative
             where n.id = :id and n.statutEmail = 'EN_COURS'
            """)
    int enregistrerEchecEmail(@Param("id") Long id,
                              @Param("statut") String statut,
                              @Param("erreur") String erreur,
                              @Param("prochaineTentative") LocalDateTime prochaineTentative);

    // Recuperation si le backend s'est arrete pendant EN_COURS (risque residuel
    // de double envoi si SMTP avait abouti juste avant le crash).
    @Modifying
    @Transactional
    @Query("""
            update Notification n
               set n.statutEmail = 'ECHEC',
                   n.erreurEmail = 'Traitement interrompu, nouvel essai programme',
                   n.prochaineTentativeEmail = :maintenant
             where n.emailEnvoye = false and n.statutEmail = 'EN_COURS'
               and (n.dateDernierEssaiEmail is null or n.dateDernierEssaiEmail < :avant)
            """)
    int recupererEmailsInterrompus(@Param("avant") LocalDateTime avant,
                                   @Param("maintenant") LocalDateTime maintenant);
}
