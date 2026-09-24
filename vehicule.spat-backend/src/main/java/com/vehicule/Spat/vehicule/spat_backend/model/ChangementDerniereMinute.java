package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Journal immuable du remplacement opérationnel d'un ticket par une urgence. */
@Entity
@Table(name = "changements_derniere_minute", uniqueConstraints =
@UniqueConstraint(name = "uk_changement_ticket_initial", columnNames = "ticket_initial_id"))
public class ChangementDerniereMinute {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name="ticket_initial_id", nullable=false)
    private Long ticketInitialId;
    @Column(name="ticket_urgent_id", nullable=false, unique=true)
    private Long ticketUrgentId;
    @Column(name="agent_matricule", nullable=false, length=100)
    private String agentMatricule;
    @Column(name="sous_categorie", nullable=false, length=100)
    private String sousCategorie;
    @Column(name="motif_urgence", nullable=false, length=1000)
    private String motifUrgence;
    @Column(name="date_changement", nullable=false)
    private LocalDateTime dateChangement = LocalDateTime.now();
    public Long getId(){return id;}
    public Long getTicketInitialId(){return ticketInitialId;}
    public void setTicketInitialId(Long id){ticketInitialId=id;}
    public Long getTicketUrgentId(){return ticketUrgentId;}
    public void setTicketUrgentId(Long id){ticketUrgentId=id;}
    public String getAgentMatricule(){return agentMatricule;}
    public void setAgentMatricule(String v){agentMatricule=v;}
    public String getSousCategorie(){return sousCategorie;}
    public void setSousCategorie(String v){sousCategorie=v;}
    public String getMotifUrgence(){return motifUrgence;}
    public void setMotifUrgence(String v){motifUrgence=v;}
    public LocalDateTime getDateChangement(){return dateChangement;}
}
