from pathlib import Path
import math, re
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'output/pdf/Guide_utilisateur_GPA_SPAT.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
for name, file in [('Arial','arial.ttf'),('ArialB','arialbd.ttf'),('ArialI','ariali.ttf')]:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/'+file))
W,H=595.276,841.89
NAVY=HexColor('#142C43'); BLUE=HexColor('#176F91'); RED=HexColor('#AC263A')
INK=HexColor('#243849'); GRAY=HexColor('#5B6D7D'); LIGHT=HexColor('#EFF4F7'); LINE=HexColor('#CFDAE2')
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('GPA SPAT | Guide utilisateur et dossier de conception')
c.setAuthor(''); c.setCreator(''); c.setSubject('Utilisation du parc automobile et conception fonctionnelle du système')
page=0; y=0; entries=[]
body=ParagraphStyle('body',fontName='Arial',fontSize=10.1,leading=15.3,textColor=INK,spaceAfter=8)
small=ParagraphStyle('small',parent=body,fontSize=8.5,leading=12)
def para(text,x=54,width=W-108,size=None,center=False):
    global y
    st=body if size is None else ParagraphStyle('custom',parent=body,fontSize=size,leading=size*1.45)
    if center: st=ParagraphStyle('center',parent=st,alignment=TA_CENTER)
    p=Paragraph(text,st); _,height=p.wrap(width,1000)
    if y-height<66: raise RuntimeError(f'Page {page} overflow at {text[:65]} y={y}')
    p.drawOn(c,x,y-height); y-=height+9
def heading(text):
    global y
    y-=9; para('<b>'+text+'</b>',size=12)
def bullet(text): para('<font color="#176F91">•</font> '+text,x=62,width=W-124)
def step(n,title,text):
    para(f'<font color="#176F91"><b>{n:02d}</b></font>  <b>{title}</b><br/>{text}')
def callout(title,text):
    global y
    p=Paragraph('<b>'+title+'</b><br/>'+text,body); _,h=p.wrap(W-138,1000)
    if y-h-28<66: raise RuntimeError('Callout overflow')
    c.setFillColor(LIGHT); c.roundRect(54,y-h-20,W-108,h+20,6,fill=1,stroke=0)
    c.setFillColor(BLUE); c.rect(54,y-h-20,3,h+20,fill=1,stroke=0)
    p.drawOn(c,69,y-h-10); y-=h+33
def new(title,kicker='GUIDE UTILISATEUR',sub=None):
    global page,y
    if page: c.showPage()
    page+=1; y=714
    c.setFillColor(NAVY); c.rect(0,H-25,W,25,fill=1,stroke=0)
    c.setFont('ArialB',9); c.setFillColor(GRAY); c.drawString(54,779,'GPA / SPAT')
    c.setFont('Arial',8); c.drawRightString(W-54,779,kicker)
    c.setFillColor(RED); c.rect(54,755,28,3,fill=1,stroke=0)
    c.setFont('ArialB',22); c.setFillColor(NAVY); c.drawString(54,726,title)
    if sub: para(sub,size=10)
    c.setStrokeColor(LINE); c.line(54,48,W-54,48)
    c.setFont('Arial',8); c.setFillColor(GRAY); c.drawString(54,33,'Guide utilisateur et conception | Édition du 10 novembre 2026')
    c.drawRightString(W-54,33,f'{page:02d}')
    c.bookmarkPage('p'+str(page)); c.addOutlineEntry(title,'p'+str(page),0,False)
    entries.append((title,page))
def box(x,top,w,h,title,lines=(),fill=LIGHT,fs=9):
    c.setFillColor(fill); c.setStrokeColor(LINE); c.roundRect(x,top-h,w,h,5,fill=1,stroke=1)
    p=Paragraph('<b>'+title+'</b>',ParagraphStyle('boxh',fontName='Arial',fontSize=fs,leading=fs*1.3,textColor=NAVY,alignment=TA_CENTER))
    _,ph=p.wrap(w-14,1000); p.drawOn(c,x+7,top-10-ph)
    if lines:
        c.setStrokeColor(LINE); c.line(x,top-ph-17,x+w,top-ph-17)
        pp=Paragraph('<br/>'.join(lines),ParagraphStyle('boxb',fontName='Arial',fontSize=fs-0.4,leading=fs*1.5,textColor=INK))
        _,bh=pp.wrap(w-16,1000)
        if bh+ph+29>h: raise RuntimeError('Box overflow '+title)
        pp.drawOn(c,x+8,top-ph-24-bh)
def arrow(x1,y1,x2,y2,label='',dashed=False):
    c.setStrokeColor(BLUE); c.setFillColor(BLUE); c.setLineWidth(1)
    c.setDash(3,3) if dashed else c.setDash()
    c.line(x1,y1,x2,y2); c.setDash()
    ang=math.atan2(y2-y1,x2-x1); a=5
    p=c.beginPath();p.moveTo(x2,y2);p.lineTo(x2-a*math.cos(ang-.45),y2-a*math.sin(ang-.45));p.lineTo(x2-a*math.cos(ang+.45),y2-a*math.sin(ang+.45));p.close()
    c.drawPath(p,fill=1,stroke=0)
    if label:
        c.setFont('Arial',8);c.setFillColor(INK); tw=pdfmetrics.stringWidth(label,'Arial',8)
        xx=(x1+x2)/2-tw/2; yy=(y1+y2)/2+7
        c.setFillColor(white);c.rect(xx-3,yy-2,tw+6,12,fill=1,stroke=0)
        c.setFillColor(INK);c.drawString(xx,yy,label)
def note(text,at=160):
    global y
    y=at; para(text,size=9)
def flow(labels,start=685,stepheight=68):
    x=140;w=315;h=43
    for i,label in enumerate(labels):
        top=start-i*stepheight
        box(x,top,w,h,label)
        if i<len(labels)-1: arrow(x+w/2,top-h,x+w/2,top-stepheight)
def diamond(x,cy,w,h,label):
    p=c.beginPath();p.moveTo(x,cy+h/2);p.lineTo(x+w/2,cy);p.lineTo(x,cy-h/2);p.lineTo(x-w/2,cy);p.close()
    c.setFillColor(LIGHT);c.setStrokeColor(BLUE);c.drawPath(p,fill=1,stroke=1)
    pp=Paragraph(label,ParagraphStyle('decision',fontName='Arial',fontSize=8.3,leading=11,textColor=INK,alignment=TA_CENTER))
    _,hh=pp.wrap(w*.65,1000);pp.drawOn(c,x-w*.325,cy-hh/2)
def dot(x,cy,end=False):
    c.setFillColor(NAVY);c.setStrokeColor(NAVY);c.circle(x,cy,4,fill=1,stroke=0)
    if end:c.circle(x,cy,7,fill=0,stroke=1)
def seq(title,actors,messages,caption):
    new(title,'CONCEPTION / SÉQUENCE')
    n=len(actors);xs=[65+i*(W-130)/(n-1) for i in range(n)]
    bw=min(95,(W-108)/n-6)
    for i,a in enumerate(actors):
        box(xs[i]-bw/2,691,bw,43,a,fs=8.5)
        c.setStrokeColor(LINE);c.setDash(3,3);c.line(xs[i],648,xs[i],210);c.setDash()
    yy=620
    for i,(a,b,label,ret) in enumerate(messages):
        # Labels are wrapped inside the available horizontal span.
        left=min(xs[a],xs[b]); span=abs(xs[a]-xs[b])
        st=ParagraphStyle('msg',fontName='Arial',fontSize=8.1,leading=10.8,textColor=INK,alignment=TA_CENTER)
        p=Paragraph(f'{i+1}. '+label,st);_,hh=p.wrap(max(span-8,80),1000)
        p.drawOn(c,left+4,yy+5)
        arrow(xs[a],yy,xs[b],yy,dashed=ret)
        yy-=max(43,hh+22)
    note(caption,at=min(180,yy-15))

# 01
new('Guide utilisateur','GESTION DU PARC AUTOMOBILE')
c.setFillColor(NAVY); c.roundRect(54,337,W-108,345,12,fill=1,stroke=0)
c.setFillColor(white);c.setFont('ArialB',40);c.drawString(82,605,'GPA SPAT')
for yy,txt in [(555,'Missions, réservations et suivi du parc'),(522,'Rôles, validations et contrôles'),(489,'Dossier de conception du système')]:
    c.setFont('Arial',16);c.drawString(82,yy,txt)
c.setFillColor(HexColor('#77C1D5'));c.rect(82,443,80,4,fill=1,stroke=0)
c.setFont('Arial',11);c.setFillColor(white);c.drawString(82,392,'Édition du 10 novembre 2026')
y=300
para('Un mode d’emploi pour les utilisateurs du portail et une annexe de conception pour les responsables fonctionnels et techniques.')
para('Le document décrit le parcours opérationnel présent dans le projet : missions en ville, missions hors ville, inspections, décisions, justificatifs et suivi des ressources.')
para('<b>Référence :</b> GPA-GU-2026-11<br/><b>Version :</b> 1.0<br/><b>Périmètre :</b> application de gestion du parc automobile SPAT',size=9)

# 02 reserved contents drawn after page list known in second pass
new('Sommaire','REPÈRES DE LECTURE')
para('Les pages 3 à 17 accompagnent les opérations quotidiennes. Les pages 18 à 29 présentent les principaux modèles de conception et leur lecture.')
contents_page=page

# 03
new('Le fonctionnement en un regard')
heading('Deux parcours à distinguer')
callout('En ville - Toamasina','L’assistant de direction enregistre la sortie, suit le calendrier de sa direction et saisit le retour. Le véhicule provient des ressources affectées à cette direction ou à son groupe de directions.')
callout('Hors ville - Service Logistique','Le Chef du Service Logistique crée la mission et choisit la voiture ainsi que le chauffeur. Une inspection DID est demandée automatiquement. Les validations N°1 puis N°2 précèdent le départ.')
heading('Les objets à reconnaître')
bullet('<b>Ticket :</b> dossier de mission identifié par une référence TKT. Cette référence doit être citée dans les échanges de suivi.')
bullet('<b>Véhicule :</b> ressource matérielle identifiée par son immatriculation. Son statut ne suffit pas à prouver sa disponibilité sur un créneau.')
bullet('<b>Bénéficiaire :</b> personne pour laquelle le déplacement est réalisé. Elle peut être différente de l’utilisateur qui saisit la mission.')
bullet('<b>Chauffeur :</b> fiche de ressource utilisée pour l’affectation d’une voiture ; son permis et ses autres engagements sont contrôlés.')
heading('Règle de travail')
para('Créer un dossier ne vaut pas autorisation de départ hors ville. Lire le statut, les avis techniques et les justificatifs avant toute décision. Une notification invite à consulter le dossier ; elle ne remplace pas sa validation.')

# 04
new('Qui fait quoi ?')
step(1,'Assistant de direction et intérim habilité','Créent les missions en ville, sélectionnent le demandeur dans le personnel de leur direction, consultent les véhicules affectés, suivent les sorties et enregistrent les retours. Ils signalent les incidents et peuvent demander un entretien dans leur périmètre.')
step(2,'Chef du Service Logistique','Crée les missions hors ville, choisit voiture et chauffeur, suit l’avis DID, effectue la validation N°1, organise les remplacements et demande l’inspection d’arrivée. Il clôture le dossier après l’avis favorable de retour et pilote les demandes d’entretien.')
step(3,'Mécanicien DID / atelier habilité','Réalise les inspections avant et après mission, renseigne les fiches de contrôle et transmet l’avis technique. Il décrit les anomalies, propose ou réalise les entretiens autorisés et renseigne le compte rendu.')
step(4,'Chef DGAL','Réalise la validation N°2 des dossiers transmis après N°1. Il consulte les pièces et le suivi du parc, et traite les réquisitions relevant de ses attributions.')
step(5,'Agent flotte et agent de sûreté','L’agent flotte assure les opérations de suivi et de dispatch prévues dans son espace. L’agent de sûreté traite ses demandes de patrouille et ses fiches de bord dans un circuit dédié.')
para('<b>Bénéficiaires, passagers et conducteurs :</b> fournissent les informations utiles et respectent l’affectation communiquée. Les saisies et décisions sont réalisées par les utilisateurs habilités du portail.',size=9)

# 05
new('Administration et accès')
heading('Types de comptes du portail')
para('<b>Administration :</b> Super Admin, Admin, Co-administrateur (lecture seule) et Directeur DFP (consultation).<br/><b>Opérations :</b> Assistant de direction, Agent par intérim de l’assistant, Chef du Service Logistique, Chef DGAL, Mécanicien DID, Agent flotte et Agent de sûreté.')
heading('Comment les comptes sont-ils créés ?')
para('<b>Admin et Super Admin :</b> ces comptes sont créés directement dans la base de données lors de l’initialisation du système. Leur mise en place relève de l’équipe technique et ne passe pas par le formulaire de création des comptes métier. L’initialisation conserve les comptes déjà présents.')
para('<b>Autres comptes métier :</b> ils sont créés manuellement par le Super Admin dans <b>Utilisateurs</b>. Celui-ci renseigne l’identité, le matricule, l’email, le rôle et les informations d’accès, puis la direction de rattachement lorsqu’elle est requise, notamment pour l’assistant et son intérim. Il vérifie l’activation et enregistre le compte.')
para('Le Super Admin contrôle les habilitations et les modifications ultérieures. Le Co-administrateur peut également être préinitialisé lors de l’installation ; ses droits restent en lecture seule. Le Directeur DFP consulte les vues autorisées sans modifier les dossiers.',size=9)
heading('Se connecter')
step(1,'Ouvrir le portail','Utiliser l’adresse de l’application communiquée par le service informatique. Saisir le matricule et le mot de passe attribués.')
step(2,'Vérifier l’espace affiché','Après connexion, le portail ouvre l’espace du rôle associé au compte. Pour un assistant, vérifier que la direction de rattachement est correcte.')
step(3,'Consulter les notifications','Ouvrir les alertes puis le dossier concerné. Vérifier la référence du ticket avant de traiter une demande.')
callout('Accès refusé ou données absentes','Ne pas utiliser le compte d’un collègue. Demander au Super Admin de vérifier l’activation, le rôle et le rattachement du compte. Le répertoire des personnels, les comptes de connexion et les fiches chauffeurs sont des données distinctes.')

# 06
new('Mot de passe oublié')
para('Depuis la connexion, cliquer sur <b>Mot de passe oublié ?</b>, puis choisir la méthode adaptée.')
heading('Contacter le Super Admin')
step(1,'Saisir le matricule','Renseigner le numéro matricule sur l’écran de connexion, puis ouvrir la récupération du mot de passe.')
step(2,'Transmettre la demande','Choisir <b>Contacter le Super Admin</b>, puis <b>Demander au Super Admin</b>. Le portail transmet une notification aux responsables concernés lorsque le matricule correspond à un compte.')
step(3,'Attendre le traitement','Le message de prise en charge ne signifie pas qu’un nouveau mot de passe a déjà été attribué. Suivre les consignes communiquées par le Super Admin.')
heading('Pas besoin de Super Admin')
step(1,'Saisir son email à la main','Choisir <b>Pas besoin de Super Admin</b>. Taper l’adresse email enregistrée pour le compte ; aucune sélection dans un répertoire n’est nécessaire. Le système vérifie le format et l’existence d’un compte actif correspondant.')
step(2,'Recevoir le mot de passe temporaire','Cliquer sur <b>Envoyer le mot de passe temporaire</b>. Consulter la boîte de réception et les courriers indésirables. Le mot de passe reçu est valable une heure.')
step(3,'Choisir le nouveau mot de passe','Dans la fenêtre de récupération, saisir le mot de passe temporaire, le nouveau mot de passe et sa confirmation. Le nouveau mot de passe doit contenir de 8 à 72 caractères. Valider puis se connecter.')
para('Si l’adresse est inconnue, le compte inactif ou l’envoi impossible, corriger la donnée ou contacter le Super Admin. Un nouveau renvoi remplace le mot de passe temporaire précédent. Ne jamais communiquer un mot de passe par un canal collectif.',size=9)

# 07
new('Créer une mission en ville')
para('<b>Espace :</b> Assistant de direction. <b>Zone :</b> ville de Toamasina.')
step(1,'Ouvrir Nouvelle mission','Choisir le moyen matériel proposé : moto ou voiture. Les ressources affichées sont celles affectées à la direction ou à son groupe de directions.')
step(2,'Choisir le demandeur','Saisir une partie du nom, du prénom, du matricule ou de l’email dans le champ de recherche. Sélectionner la bonne personne dans les résultats. La liste est limitée au personnel de la direction connectée ; il n’y a pas de filtres supplémentaires à choisir.')
step(3,'Renseigner le déplacement','Préciser l’objet, la destination, le départ immédiat ou la date et l’heure prévues, ainsi que la durée estimée en minutes. La durée admise va de 1 à 1 440 minutes ; elle détermine l’heure de retour prévue et le créneau réservé.')
step(4,'Vérifier les ressources','Pour une moto, choisir le conducteur habilité lorsque le formulaire le demande. Pour une voiture, le parcours rapide affecte un chauffeur disponible avec un permis valide. Si aucune ressource ne convient, la création est bloquée.')
step(5,'Créer et contrôler le résultat','Renseigner les observations utiles, puis cliquer sur <b>Créer la mission</b>. Vérifier la présence dans le calendrier, la période, l’immatriculation et la référence du dossier.')
callout('Départ le jour même ou réservation future','Le parcours rapide accepte les sorties du jour sans délai de 24 heures. Une sortie planifiée à une date future doit respecter les 24 heures et un départ dans les plages 08:00-12:00 ou 14:00-18:00. Le départ ne peut pas être passé.')

# 08
new('Suivre et clôturer en ville')
heading('Calendrier et historique')
para('Consulter le calendrier de la direction pour retrouver les missions actives. Ouvrir la mission pour vérifier le demandeur, le trajet, la période, le véhicule et les informations de retour. Les états « Planifiée », « En cours » et « Clôturée » permettent de situer l’avancement.')
para('Une même voiture peut être mutualisée entre plusieurs directions. L’accès au véhicule ne garantit pas qu’il soit libre : un engagement dans une autre direction peut bloquer le créneau.')
heading('Au retour du véhicule')
step(1,'Ouvrir la mission concernée','Utiliser la référence et l’immatriculation pour éviter de clôturer un autre déplacement. La clôture est disponible à partir de l’heure de départ.')
step(2,'Saisir le retour réel','Renseigner la date et l’heure du retour. Le retour doit être postérieur au départ et ne doit pas être situé dans le futur.')
step(3,'Décrire les anomalies','Ajouter les observations demandées. Si un incident a rendu le véhicule impropre à une nouvelle sortie, utiliser le signalement d’incident pour déclencher le traitement correspondant.')
step(4,'Clôturer et vérifier','Valider la clôture. La mission rejoint l’historique et sa fin prévue est remplacée par le retour réel enregistré. Vérifier les informations avant de préparer une nouvelle sortie.')
callout('Retour en retard','Une heure de retour estimée dépassée n’est pas une preuve de retour effectif. Contacter le responsable du déplacement, régulariser la mission et prévenir la Logistique si une autre réservation est concernée.')
para('Le calendrier propose aussi des exports de statistiques par période. Les durées réalisées dépendent des retours effectivement renseignés.',size=9)

# 09
new('Créer une mission hors ville')
para('<b>Espace :</b> Chef du Service Logistique. Le bouton <b>Nouvelle mission</b> se trouve à côté de <b>Navettes parapheurs PACT</b>.')
step(1,'Identifier le bénéficiaire','Saisir ou sélectionner l’identité et renseigner la direction, le département ou le service. Vérifier le matricule : il sert aussi à retrouver le destinataire de l’ordre de mission.')
step(2,'Décrire la mission','Compléter le motif, la destination ou le lieu de placement, le nombre de jours, les dates et heures de départ et de retour, ainsi que le forfaitaire demandé. Le départ est prévu depuis SPAT Toamasina ; la zone hors ville et le type voiture sont prédéfinis.')
step(3,'Compléter passagers et contraintes','Renseigner le nombre et la liste des passagers, puis les observations utiles. Vérifier que la période couvre tout le déplacement et non uniquement le jour de départ.')
step(4,'Choisir le véhicule et le chauffeur','Dans <b>Choisir le véhicule</b>, sélectionner une voiture de mission disponible sur toute la période, puis un chauffeur disponible. Le circuit ordinaire hors ville utilise les voitures 1614 WWA ou 1615 WWA.')
step(5,'Créer le ticket','Cliquer une seule fois sur <b>Créer le ticket</b>. L’enregistrement demande automatiquement l’inspection visuelle au mécanicien DID. Un popup cite l’immatriculation et confirme l’attente de son retour.')
callout('Après la création','Il n’y a pas d’envoi manuel supplémentaire de la demande d’inspection. Le ticket est en attente d’avis DID. Il doit encore recevoir l’avis favorable, la validation N°1 et la validation N°2 avant le départ.')

# 10
new('Inspection visuelle avant mission')
heading('Travail du mécanicien DID')
step(1,'Ouvrir le bon contrôle','Depuis les inspections en attente ou la notification, identifier le ticket et l’immatriculation. Vérifier qu’il s’agit du contrôle avant mission.')
step(2,'Inspecter et renseigner la fiche','Examiner le véhicule et compléter les rubriques de la fiche de contrôle affichée. Renseigner le diagnostic, les observations et les anomalies utiles au traitement.')
step(3,'Transmettre le résultat','Le bouton de contrôle avant mission enregistre la fiche et transmet un avis favorable. Lorsqu’une anomalie bloque le départ, utiliser la procédure d’avis défavorable prévue dans l’espace et décrire précisément le problème ; ne pas confirmer un contrôle favorable par simple commodité.')
heading('Travail de la Logistique après l’avis')
para('<b>Avis favorable :</b> ouvrir le dossier, vérifier qu’il concerne la voiture toujours affectée et préparer la validation N°1. Un avis favorable constitue une autorisation technique de poursuivre le circuit, pas la décision finale de départ.')
para('<b>Avis défavorable :</b> choisir un véhicule de remplacement différent et disponible, vérifier ou changer le chauffeur, puis relancer l’inspection. Les contrôles précédents restent dans l’historique. La dernière décision DID du ticket doit être favorable pour le véhicule finalement retenu.')
callout('Si le véhicule change','Un ancien avis favorable portant sur une autre voiture ne valide pas le remplacement. La disponibilité et le nouveau contrôle doivent être vérifiés avant N°1.')

# 11
new('Ordre de mission et validations')
heading('Préparer la pièce signée')
step(1,'Générer le document','Dans le détail de mission, télécharger le PDF de l’ordre de mission. Vérifier l’identité, les dates, le trajet et les ressources avant transmission pour signature.')
step(2,'Transmettre pour signature','L’envoi par email utilise l’adresse du bénéficiaire retrouvée par son matricule dans les comptes enregistrés. Si elle est absente, la faire corriger. L’envoi est limité à un PDF de 15 Mo maximum.')
step(3,'Déposer la version signée','Après signature manuelle par les personnes compétentes, déposer le fichier dans les <b>Justificatifs</b> de cette réservation, au type <b>Ordre de mission</b>. Faire valider la pièce par un utilisateur habilité.')
heading('N°1 - Chef du Service Logistique')
para('Après le dernier avis DID favorable sur le bon véhicule, le Chef du Service Logistique vérifie l’affectation et réalise la première validation. Le système recontrôle notamment le véhicule, le chauffeur et son permis. Le ticket passe à <b>VALIDEE_N1</b> et attend le DGAL.')
heading('N°2 - Chef DGAL')
para('Le Chef DGAL vérifie le dossier et réalise la seconde validation avant l’heure de départ. Le système contrôle la traçabilité de N°1, la disponibilité, les documents et les règles de période. Pour une voiture de mission, l’ordre de mission signé, déposé et validé est obligatoire. La mission hors ville devient <b>PLANIFIEE</b>.')
callout('Déposer ne signifie pas valider','Un fichier présent dans le dossier mais encore non validé ne satisfait pas la règle de l’ordre de mission. Il doit comporter une validation tracée avec auteur et date.')

# 12
new('Retour d’une mission hors ville')
step(1,'Préparer le retour avec la Logistique','Retrouver la mission et vérifier l’immatriculation. Communiquer le retour effectif, le kilométrage ou les informations du carnet de bord ainsi que toute anomalie constatée.')
step(2,'Demander l’inspection d’arrivée','Le Chef du Service Logistique déclenche la demande de contrôle visuel après mission. Cette action est ouverte dans les 24 dernières heures de la mission prévue, puis reste possible au retour. Le ticket attend à nouveau l’avis DID.')
step(3,'Renseigner le contrôle après mission','Le mécanicien DID ouvre la fiche d’arrivée et renseigne les résultats de l’examen. La fiche de contrôle précédente peut servir de base de comparaison. Un problème doit être décrit et traité dans le circuit approprié.')
step(4,'Clôturer après avis favorable','Le Chef du Service Logistique clôture définitivement le ticket après le dernier avis favorable du contrôle après mission. En l’absence de cet avis, la clôture est refusée.')
step(5,'Vérifier la traçabilité','Contrôler l’état clôturé, les justificatifs et les informations de bord. En cas d’entretien ou d’incident encore actif, coordonner la remise en disponibilité avant une nouvelle réservation.')
callout('Deux avis, deux moments','L’avis de départ ne remplace pas l’avis d’arrivée. Le même libellé « En attente d’avis DID » peut correspondre à l’une ou l’autre étape : lire la nature du contrôle pour savoir ce qui est attendu.')

# 13
new('Ce qui bloque les ressources')
heading('Disponibilité du véhicule')
bullet('<b>Conflit de période :</b> un autre ticket mobilise le véhicule sur un créneau qui chevauche la mission. Le contrôle couvre la période complète, même pour une mission de plusieurs jours.')
bullet('<b>Statut incompatible :</b> indisponibilité, panne, maintenance ou réquisition empêchent l’utilisation normale. Un véhicule actuellement en mission peut néanmoins être prévu pour plus tard si son créneau est libre.')
bullet('<b>Entretien actif :</b> une demande d’entretien en attente de décision, autorisée, planifiée, en cours ou terminée mais non clôturée peut maintenir le véhicule indisponible jusqu’au traitement de la Logistique.')
bullet('<b>Assurance :</b> au moins une assurance doit couvrir la totalité de la mission. Une assurance qui expire avant le retour ne suffit pas.')
bullet('<b>Visite technique :</b> la date doit être renseignée et rester valide jusqu’à la fin de la mission.')
bullet('<b>Affectation ou catégorie :</b> une ressource non affectée à la direction n’est pas utilisable par son assistant. Les voitures hors ville et le véhicule de patrouille suivent leurs catégories et leurs circuits propres.')
heading('Disponibilité du chauffeur')
para('Un chauffeur doit exister, avoir un statut admissible et ne pas être engagé sur une mission concurrente. Son numéro de permis et sa date d’expiration doivent être renseignés ; le permis doit rester valide jusqu’au retour prévu. Lorsque la compatibilité véhicule/chauffeur est requise, l’affectation doit également la respecter.')
callout('Réaction attendue','Lire la cause affichée et consulter le planning. Choisir une autre période ou une autre ressource autorisée ; confier les corrections de documents, d’affectation ou de statut au responsable habilité.')

# 14
new('Ce qui bloque le dossier')
heading('Dates et délais')
bullet('Une période doit avoir un début et une fin cohérents, avec une fin postérieure au début. Les validations hors ville doivent précéder le départ.')
bullet('Une mission en ville planifiée à une date future exige au moins 24 heures d’anticipation. Le parcours rapide du jour constitue un cas distinct.')
bullet('Une demande hors ville tardive n’est pas automatiquement une urgence. Le contrôle final exige le respect du délai ou un traitement d’urgence motivé et tracé dans le circuit prévu, notamment les Réquisitions DGAL.')
heading('Horaires et documents')
bullet('Les plages ordinaires sont 08:00-12:00 et 14:00-18:00. Une utilisation hors horaires, traversant la pause, sur plusieurs jours, le week-end ou un jour férié configuré exige une justification dans les observations au contrôle final.')
bullet('Les motos électriques ne sont pas réservables pendant la nuit, définie par défaut entre 18:00 et 06:00. Une utilisation sur plusieurs jours traverse cette période et ne relève pas d’une sortie moto ordinaire.')
bullet('Au contrôle de conformité final, la carte grise doit être déposée et validée. Pour une voiture de mission, l’ordre de mission signé doit être validé avant N°2.')
heading('Étapes et habilitations')
para('Une décision peut être refusée si l’utilisateur n’a pas le bon rôle, si le ticket est déjà traité, si N°1 manque ou si le dernier avis DID n’est pas favorable pour la voiture retenue. Une pièce jointe, un popup de création ou un email ne remplacent aucune de ces étapes.')
para('<b>Important :</b> les contrôles sont répartis entre la saisie, l’affectation et la décision finale. L’affichage « disponible » ne certifie pas à lui seul que tout le dossier administratif est complet.',size=9)

# 15
new('Incidents et entretien')
heading('Signaler un incident')
step(1,'Identifier le véhicule','Dans <b>Signaler un incident</b>, choisir la bonne immatriculation. Pour l’assistant, les véhicules proposés sont ceux de son périmètre. Un véhicule déjà en mission ou indisponible peut faire l’objet d’un signalement.')
step(2,'Décrire les faits','Choisir la nature du problème et renseigner les informations demandées : contexte, description et mission associée lorsqu’elle est connue. Éviter d’associer le signalement à un ticket d’un autre véhicule.')
step(3,'Enregistrer et prévenir','Le signalement rend le véhicule indisponible et alerte les responsables concernés, notamment la Logistique et l’assistant de la direction. Organiser la prise en charge avec ces responsables.')
heading('Demander et terminer un entretien')
para('L’assistant ou le mécanicien habilité peut créer une demande d’entretien. La demande place le véhicule en maintenance et attend la décision du Chef du Service Logistique. Celui-ci autorise ou refuse l’intervention et peut la transmettre au circuit périodique si nécessaire.')
para('Après intervention autorisée, le mécanicien renseigne le compte rendu et marque l’entretien terminé. Le Chef du Service Logistique confirme la clôture. <b>« Entretien terminé » n’équivaut donc pas encore à « véhicule réservable ».</b> La restitution du statut tient compte du circuit de maintenance.')
callout('Sécurité opérationnelle','Ne pas remettre un véhicule en circulation sur la seule base d’une clôture de mission si une panne, un incident ou un entretien reste à traiter. Décrire les anomalies dans le dossier approprié et demander la confirmation de la Logistique.')

# 16
new('Autres fonctions utiles')
heading('GPS et carnet de bord')
para('Les écrans GPS présentent les véhicules équipés et les données reçues du service connecté. Lire la date de dernière position avant toute interprétation. Une position ancienne ou absente ne prouve pas que le véhicule se trouve actuellement sur place ; la couverture, l’équipement et le fournisseur peuvent expliquer un retard.')
para('Le carnet de bord conserve les informations de sortie et de retour : conducteur, motif, destination, horaires, kilométrage ou charge et anomalies selon le formulaire. Vérifier les données saisies ; une position GPS ne remplace pas une saisie de retour.')
heading('Emails et notifications')
para('Le centre de notifications permet de retrouver les alertes et les dossiers à traiter. Certaines alertes sont relayées par email selon la configuration et les coordonnées enregistrées. L’échec ou le retard d’un email ne prouve pas l’absence du dossier : vérifier son état dans le portail.')
heading('Réquisitions, sûreté et navettes PACT')
para('Le Chef DGAL dispose d’un parcours de réquisition motivée et tracée. Une ressource réquisitionnée sort de la disponibilité ordinaire. Coordonner toute reprogrammation avec la Logistique plutôt que créer une réservation concurrente.')
para('Les patrouilles de sûreté utilisent leur circuit et le véhicule dédié. Les navettes parapheurs PACT sont des occurrences dédiées gérées par la Logistique : affectation manuelle, règles de disponibilité et pièces requises. Elles ne se traitent pas comme une demande hors ville ordinaire.')
heading('Carburant, échéances et rapports')
para('Les espaces habilités suivent les transactions de carburant, les reçus, les assurances, les sinistres et les entretiens périodiques. Des alertes d’échéance sont prévues à J-30, J-15 et J-7. Les tableaux de bord et exports aident à suivre les volumes et la consommation ; leur fiabilité dépend de dossiers correctement renseignés.')

# 17
new('Aide pratique et contrôles rapides')
heading('Avant d’enregistrer')
bullet('Vérifier le bénéficiaire, le matricule, la direction, la destination et le motif.')
bullet('Réserver une période couvrant l’aller, l’activité et le retour ; choisir une durée réaliste en ville.')
bullet('Contrôler les ressources et lire toute cause d’indisponibilité. Saisir les observations utiles sans contourner un blocage.')
heading('Avant un départ hors ville')
bullet('Dernier contrôle DID favorable pour la voiture effectivement retenue.')
bullet('Véhicule et chauffeur disponibles, permis et documents valides sur la période.')
bullet('Validation N°1 réalisée, ordre de mission signé et validé, puis validation N°2 obtenue avant départ.')
heading('Si quelque chose ne fonctionne pas')
para('<b>Personnel ou véhicule absent :</b> vérifier d’abord la direction connectée et le périmètre attendu ; demander ensuite à l’administration de contrôler les données et affectations.')
para('<b>Email non reçu :</b> consulter les indésirables, vérifier l’adresse enregistrée et le résultat de l’action. Pour le mot de passe oublié, demander un nouveau temporaire si le précédent a expiré.')
para('<b>Action refusée :</b> relever le message, la référence TKT, l’immatriculation, l’heure et l’action tentée. Transmettre ces éléments au responsable du module ou au service informatique, sans joindre de mot de passe.')
callout('Après un doute sur l’enregistrement','Actualiser la liste et rechercher le ticket avant de recommencer. Une coupure de connexion après un clic peut laisser une opération déjà enregistrée ; éviter les doublons.')

# 18
new('Cas d’utilisation','CONCEPTION / VUE FONCTIONNELLE')
para('Vue synthétique des responsabilités dans le périmètre courant. Les droits précis sont vérifiés à chaque action par le serveur.',size=9)
actors=[('Assistant de direction',['Créer / suivre une mission en ville','Clôturer une sortie et signaler un incident']),('Chef du Service Logistique',['Créer la mission hors ville et affecter','Valider N°1 / gérer retour et entretien']),('Mécanicien DID',['Inspecter avant et après mission','Émettre un avis / rendre compte']),('Chef DGAL',['Valider N°2','Réquisitionner et superviser']),('Administration habilitée',['Gérer comptes et référentiels','Maintenir les documents et affectations'])]
top=650
c.setStrokeColor(LINE);c.roundRect(223,184,318,490,6,fill=0,stroke=1)
for name,uses in actors:
    cx=94;cy=top-15
    c.setStrokeColor(BLUE);c.circle(cx,cy,7,fill=0,stroke=1)
    c.line(cx,cy-7,cx,cy-27);c.line(cx-12,cy-15,cx+12,cy-15)
    c.line(cx,cy-27,cx-11,cy-40);c.line(cx,cy-27,cx+11,cy-40)
    pp=Paragraph(name,ParagraphStyle('actor',fontName='Arial',fontSize=8.3,leading=11,textColor=INK,alignment=TA_CENTER))
    _,hh=pp.wrap(140,1000);pp.drawOn(c,54,cy-43-hh)
    c.setFillColor(LIGHT);c.setStrokeColor(LINE);c.ellipse(245,top-64,519,top,fill=1,stroke=1)
    pp=Paragraph('<br/>'.join(uses),ParagraphStyle('use',fontName='Arial',fontSize=9,leading=13,textColor=INK,alignment=TA_CENTER))
    _,hh=pp.wrap(235,1000);pp.drawOn(c,264,top-32-hh/2)
    c.setStrokeColor(BLUE);c.line(106,cy-15,245,top-32)
    top-=91
note('Les personnels bénéficiaires et les fiches conducteurs alimentent les dossiers. Les profils de consultation lisent les vues autorisées sans réaliser les décisions du circuit.',160)

# 19
new('Activité : mission en ville','CONCEPTION / ACTIVITÉ')
dot(290,695);arrow(290,691,290,676)
for top,label in [(676,'Assistant : choisir moto ou voiture'),(613,'Sélectionner personnel, trajet, départ et durée')]:
    box(125,top,330,40,label);arrow(290,top-40,290,top-63)
diamond(290,503,200,65,'Ressources et période<br/>admissibles ?')
arrow(290,573,290,536)
arrow(190,503,85,503,'Non');arrow(85,503,85,593);arrow(85,593,125,593)
arrow(290,470,290,437,'Oui')
box(125,437,330,40,'Système : créer la mission PLANIFIEE')
arrow(290,397,290,374);box(125,374,330,40,'Assistant : suivre le déplacement et le retour')
arrow(290,334,290,311);box(125,311,330,40,'Saisir le retour réel puis clôturer')
arrow(290,271,290,249);dot(290,241,True)
note('Si une contrainte est détectée, la création est refusée avec un motif : corriger la donnée ou choisir une période autorisée, puis recommencer. Le parcours du jour est distinct d’une réservation future soumise au délai de 24 heures.',172)

# 20
new('Activité : mission hors ville','CONCEPTION / ACTIVITÉ')
dot(302,697);arrow(302,693,302,678)
for top,label in [(678,'Logistique : créer mission, voiture et chauffeur'),(622,'Système : demander automatiquement le contrôle'),(566,'DID : inspecter et transmettre l’avis')]:
    box(137,top,330,36,label)
    if top!=566:arrow(302,top-36,302,top-56)
arrow(302,530,302,507);diamond(302,479,172,56,'Avis favorable ?')
arrow(216,479,80,479,'Non');arrow(80,479,80,540)
box(34,595,93,55,'Remplacer voiture / chauffeur',fs=8)
arrow(80,595,80,640);arrow(80,640,302,640);arrow(302,640,302,622)
arrow(302,451,302,429,'Oui')
for top,label in [(429,'Logistique : N°1 / pièce signée validée'),(373,'DGAL : N°2 si tous les contrôles sont satisfaits'),(317,'Exécution puis inspection DID d’arrivée'),(261,'Logistique : clôturer après avis favorable')]:
    box(137,top,330,36,label)
    if top!=261:arrow(302,top-36,302,top-56)
arrow(302,225,302,207);dot(302,200,True)
note('Branche défavorable avant départ : remplacement du véhicule et, si nécessaire, du chauffeur, puis nouvelle inspection. Branche bloquante à la décision finale : compléter les pièces, la justification ou les ressources avant de représenter le dossier.',176)

# 21
seq('Séquence système : hors ville',['Logistique','Système GPA','Mécanicien DID','Chef DGAL'],[
 (0,1,'Créer la mission avec voiture et chauffeur',False),(1,0,'Ticket et attente d’avis DID',True),(1,2,'Demande automatique d’inspection',False),(2,1,'Fiche et avis technique',False),(0,1,'Valider N°1 après avis favorable',False),(0,1,'Déposer / valider le document signé',False),(3,1,'Valider N°2 avant départ',False),(1,3,'Mission planifiée ou motif de blocage',True)
], 'Diagramme de séquence système : le portail est représenté comme une boîte unique. Les messages résument les interactions des acteurs, sans détailler les composants internes. La signature manuelle intervient hors du portail avant le dépôt de la pièce.')

# 22
seq('Séquence de conception : création',['Interface web','API réservations','Disponibilités','Base de données'],[
 (0,1,'POST création hors ville',False),(1,3,'Charger et verrouiller les ressources',False),(1,2,'Vérifier véhicule et chauffeur sur la période',False),(2,3,'Rechercher documents et chevauchements',False),(2,1,'Résultat des contrôles',True),(1,3,'Enregistrer ticket, contrôle DID et notification',False),(1,0,'Succès avec ticket en attente DID',True)
], 'La création et la demande d’inspection appartiennent à la même transaction métier. Si la création du contrôle échoue, le ticket ne doit pas rester créé sans inspection. Le relais email des notifications est traité séparément ; l’utilisateur suit le dossier dans le portail.')

# 23
seq('Séquence de conception : N°2',['Chef DGAL','API réservations','Règles métier','Base de données'],[
 (0,1,'Demander validation N°2',False),(1,3,'Charger ticket et verrouiller ressources',False),(1,1,'',False)
][:2]+[
 (1,2,'Vérifier état N°1, dates et conformité',False),(2,3,'Vérifier planning, documents et permis',False),(2,1,'Autorisation ou cause bloquante',True),(1,3,'Enregistrer PLANIFIEE, auteur et date N°2',False),(1,0,'Résultat de validation',True)
], 'Le passage à N°2 exige N°1 et sa traçabilité, des ressources affectées, un départ futur et un ordre de mission signé validé pour la catégorie mission. En cas de refus métier, le portail renvoie une cause de blocage ; il ne suffit pas de répéter le clic.')

# 24
seq('Séquence : récupération par email',['Utilisateur','Portail / API','Comptes','Courriel'],[
 (0,1,'Saisir manuellement l’email',False),(1,2,'Rechercher un compte actif correspondant',False),(2,1,'Compte trouvé ou refus',True),(1,2,'Stocker le hash temporaire et l’expiration',False),(1,3,'Envoyer le mot de passe temporaire',False),(0,1,'Saisir temporaire et nouveau mot de passe',False),(1,2,'Vérifier validité puis changer le mot de passe',False),(1,0,'Confirmation et retour à la connexion',True)
], 'Le mot de passe temporaire est valable une heure. Un échec d’envoi efface le temporaire créé et renvoie une erreur. Après changement réussi, le temporaire est effacé. L’autre méthode transmet une demande au Super Admin à partir du matricule.')

# 25
new('Classes : noyau des missions','CONCEPTION / MODÈLE DE CLASSES')
box(54,688,203,116,'Utilisateur',['id, matricule, email','rôle, actif, directionId'],fs=9)
box(338,688,203,116,'Vehicule',['id, immatriculation, catégorie','statut, visite technique','directions, gpsDeviceId'],fs=9)
box(150,503,295,141,'Reservation',['id, motif, zoneMission, statut','dateDebut, dateFin, modeCreation','demandeurNom / Prenom / Matricule','validationN1Par / N2Par, dates'],fs=9)
box(54,279,145,112,'Chauffeur',['id, identité, statut','numéro de permis','expirationPermis'],fs=9)
box(225,279,145,112,'Maintenance',['id, nature, statut','decisionDID, fiche','dateAvisDID'],fs=9)
box(396,279,145,112,'Justificatif',['id, type, fichier, valide','deposePar, validePar','dates de traçabilité'],fs=9)
arrow(155,572,225,503,'1 / 0..*')
arrow(438,572,370,503,'0..1 / 0..*')
arrow(208,362,126,279,'0..* / 0..1')
arrow(298,362,298,279,'0..1 / 0..*')
arrow(388,362,468,279,'0..1 / 0..*')
note('Modèle simplifié, fondé sur les entités du projet. Une réservation a un créateur et peut référencer un véhicule et un chauffeur. Plusieurs contrôles et justificatifs peuvent lui être rattachés. Chaque couple indique les multiplicités du départ puis de l’arrivée de la flèche ; les flèches guident la lecture, sans exprimer une propriété exclusive.',145)

# 26
new('Classes : ressources et traçabilité','CONCEPTION / MODÈLE DE CLASSES')
box(54,688,208,111,'Direction',['id, code, nom, actif'],fs=9)
box(332,688,209,111,'Vehicule',['immatriculation, catégorie, statut','directions : ensemble'],fs=9)
arrow(262,641,332,641,'0..* / 0..*')
box(54,493,208,120,'ConducteurAutorise',['matricule, nomComplet','direction, permis, actif','valide, validePar, dateValidation'],fs=9)
box(332,493,209,120,'Assurance',['véhicule, dateDebut','dateExpiration'],fs=9)
arrow(158,577,158,493,'1 / 0..*')
arrow(436,577,436,493,'1 / 0..*')
box(54,292,208,111,'Utilisateur',['matricule, rôle, directionId','email, actif'],fs=9)
box(332,292,209,111,'Notification',['destinataire, type, message','ticket, véhicule, état email'],fs=9)
arrow(262,242,332,242,'destinataire')
note('Le rattachement Utilisateur-direction est porté par un identifiant dans le modèle. Le personnel bénéficiaire est conservé dans la réservation par ses champs d’identité ; il ne faut pas le confondre avec son créateur. Les fiches de conduite moto et les fiches chauffeurs sont deux ressources distinctes.',145)

# 27
new('États du dossier hors ville','CONCEPTION / ÉTATS-TRANSITIONS')
flow(['EN_ATTENTE : début de création','EN_ATTENTE_AVIS_DID : contrôle de départ','VALIDEE_N1 : décision Logistique','PLANIFIEE : décision DGAL obtenue','EN_COURS : suivi de l’exécution','EN_ATTENTE_AVIS_DID : contrôle d’arrivée','CLOTUREE : décision de clôture Logistique'],stepheight=67)
note('Vue du chemin favorable. L’état initial peut être très bref car l’inspection est créée automatiquement. Un refus peut conduire à REFUSEE ; une urgence à reprogrammer suit son traitement dédié. Un avis DID défavorable est d’abord une décision du contrôle : ne pas le confondre avec un refus définitif du ticket.',174)

# 28
new('Paquetages et responsabilités','CONCEPTION / PAQUETAGES')
box(54,690,487,68,'Présentation - frontend Next.js / React',['Pages par rôle, formulaires, composants partagés, calendrier, exports'],fs=10)
arrow(298,622,298,594,'REST / JSON + jeton JWT')
box(54,594,487,80,'API et sécurité - backend Spring Boot',['controller, dto, config : routes, identité, rôles et périmètres'],fs=10)
arrow(298,514,298,484)
box(54,484,487,96,'Services métier',['Planification, disponibilité, règles du dispositif, maintenance','Personnel de direction, notifications, GPS, stockage de fichiers'],fs=10)
arrow(298,388,298,359)
box(54,359,229,94,'Persistance',['model : entités JPA','repository : accès aux données'],fs=9)
box(312,359,229,94,'Intégrations',['Courriel SMTP','Fournisseur GPS / fichiers'],fs=9)
arrow(298,389,426,359)
note('Les composants d’interface collectent et affichent ; les contrôleurs exposent les opérations ; les services appliquent les règles ; les repositories accèdent aux données. Les contrôles côté serveur restent la référence même si l’interface masque une action ou une ressource.',209)

# 29
new('Architecture et déploiement','CONCEPTION / COMPOSANTS')
box(148,688,299,64,'Poste utilisateur / navigateur',['Connexion et espace correspondant au rôle'],fs=10)
arrow(298,624,298,588,'Accès au portail')
box(148,588,299,64,'Application web Next.js',['Interface React / TypeScript'],fs=10)
arrow(298,524,298,488,'API REST authentifiée')
box(54,488,487,83,'Service applicatif Spring Boot / Java 21',['Authentification JWT, règles métier, décisions et traçabilité'],fs=10)
arrow(161,405,161,358,'JPA / SQL')
arrow(435,405,435,358,'Fichiers')
box(54,358,215,70,'PostgreSQL',['Réservations, ressources, contrôles'],fs=9)
box(326,358,215,70,'Stockage des pièces',['Documents véhicules et missions'],fs=9)
box(54,244,215,63,'Service SMTP',['Emails et pièces jointes'],fs=9)
box(326,244,215,63,'Fournisseur GPS',['Positions des équipements'],fs=9)
arrow(75,405,75,244,dashed=True);arrow(520,405,520,244,dashed=True)
note('Vue logique du déploiement ; les adresses, secrets et noms de serveurs ne figurent pas dans ce document. Le transport sécurisé, les sauvegardes, l’accès réseau et la supervision sont à organiser selon l’infrastructure retenue par l’entreprise.',147)

c.save()

# Fill contents and normalize neutral document metadata, without authorship attribution.
temp=ROOT/'tmp/pdfs/contents.pdf'
cc=canvas.Canvas(str(temp),pagesize=(W,H))
yy=655
groups=[('UTILISATION QUOTIDIENNE',entries[2:17]),('CONCEPTION DU SYSTÈME',entries[17:29])]
for group,items in groups:
    cc.setFont('ArialB',9);cc.setFillColor(BLUE);cc.drawString(54,yy,group);yy-=20
    for title,num in items:
        cc.setFont('Arial',9);cc.setFillColor(INK);cc.drawString(54,yy,title);cc.drawRightString(W-54,yy,f'{num:02d}');yy-=16
    yy-=9
cc.save()
reader=PdfReader(OUT);writer=PdfWriter();writer.clone_document_from_reader(reader)
writer.pages[1].merge_page(PdfReader(temp).pages[0])
writer.add_metadata({'/Title':'GPA SPAT - Guide utilisateur et dossier de conception','/Author':'','/Creator':'','/Producer':'','/Subject':'Missions, réservations, rôles et conception du système'})
with OUT.open('wb') as f:writer.write(f)
print(f'Created {OUT} ({len(writer.pages)} pages)')
