# GPA SPAT — Gestion du parc automobile

Portail numérique composé de `vehicule.spat-frontend` (Next.js) et `vehicule.spat-backend` (Spring Boot/PostgreSQL).

## Règles de gestion

- Toute demande de véhicule passe par le portail et respecte son circuit de catégorie.
- Les missions en ville utilisent une voiture ou une moto selon l'affectation ; elles sont reçues et planifiées par l'Assistante de direction.
- Les missions hors ville utilisent uniquement une voiture. Le Chef du Service Logistique choisit la voiture et le conducteur.
- Les véhicules de mission exigent un ordre de mission signé et validé. Le PDF est téléchargeable dans le détail de la mission et peut être envoyé au demandeur par email pour signature manuelle.
- Une demande future respecte le délai de 24 heures et les horaires 08:00–12:00 / 14:00–18:00. Hors horaires, week-end ou jour férié, une justification est obligatoire.
- Les chevauchements de missions sont bloquants. Panne, maintenance, assurance absente/expirée, carte grise non validée ou visite technique expirée rendent le véhicule indisponible.
- Les motos ne sont pas réservables de nuit et leurs conducteurs doivent être validés par le Directeur de leur Direction.
- Un incident rend automatiquement le véhicule indisponible et alerte le Service Logistique et l'assistante concernée.
- Les alertes d'assurance, de visite technique et d'entretien sont émises à J-30, J-15 et J-7.
- Le carnet de bord conserve les dates, horaires, conducteur, destination, motif, kilométrage ou charge, état avant/après et anomalies.
- Le DGAL peut réquisitionner un véhicule ; le motif, les notifications et l'action sont tracés.
- Aucun compte ni espace conducteur n'est ouvert : les conducteurs sont uniquement des fiches d'affectation gérées par la Logistique.

## Documentation

- [README frontend et mode d'emploi](vehicule.spat-frontend/README.md)
- [Documentation officielle](vehicule.spat-frontend/docs/DOCUMENTATION_OFFICIELLE.md)
Les données officielles, les jours fériés, les identifiants GPS, la configuration SMTP et la recette avec les équipes doivent être renseignés avant la mise en service.
