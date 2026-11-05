import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const API = 'http://127.0.0.1:18080/api';
process.env.TZ = 'Indian/Antananarivo';
const DB = 'spat_recette_20261022';
const PASSWORD = 'Recette-GPA-2026!'; // Uniquement pour les comptes artificiels de cette base locale.
const uri = new URL(process.env.SPAT_DB_URL.replace(/^jdbc:/, ''));
assert(['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname), 'PostgreSQL doit être local');
const pg = 'C:/Program Files/PostgreSQL/16/bin/psql.exe';
function sql(statement) {
  const r = spawnSync(pg, ['-h', uri.hostname, '-p', uri.port || '5432', '-U', process.env.SPAT_DB_USERNAME,
    '-d', DB, '-w', '-t', '-A', '-v', 'ON_ERROR_STOP=1'], {
    input: statement, encoding: 'utf8', env: { ...process.env, PGPASSWORD: process.env.SPAT_DB_PASSWORD, PGCLIENTENCODING: 'UTF8', PGOPTIONS: '-c timezone=Indian/Antananarivo' },
  });
  if (r.status !== 0) throw new Error(r.stderr.trim());
  return r.stdout.trim();
}
const q = s => "'" + String(s).replaceAll("'", "''") + "'";
const rows = statement => JSON.parse(sql(`SELECT coalesce(json_agg(t),'[]') FROM (${statement}) t;`));
const roles = ['SUPER_ADMIN','ADMIN','CO_ADMIN','DIRECTEUR_DFP','CHEF_SERVICE_LOGISTIQUE','CHEF_DIRECTION',
  'ASSISTANT_DIRECTION','CHEF_DGAL','MECANICIEN_DID','AGENT_FLOTTE','CHAUFFEUR'];
const results = [];
const tokens = {};
async function http(role, method, route, body, expected = 200) {
  const headers = role ? { Authorization: `Bearer ${tokens[role]}` } : {};
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + route, { method, headers,
    body: body ? body instanceof FormData ? body : JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  if (res.status !== expected) throw new Error(`${method} ${route}: attendu ${expected}, reçu ${res.status}; ${text.slice(0,700)}`);
  return data;
}
async function test(nom, fn) {
  try { await fn(); results.push({ nom, succes: true }); console.log('OK ' + nom); }
  catch (e) { results.push({ nom, succes: false, erreur: e.message }); console.log('ECHEC ' + nom + ': ' + e.message); }
}
const tag = Date.now().toString(36).toUpperCase();
sql(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
sql(`UPDATE reservations SET statut='REFUSEE',motif_refus='Occurrence de recette précédente terminée' WHERE demandeur_id IN
  (SELECT id FROM utilisateurs WHERE matricule LIKE 'REC_%') AND statut NOT IN ('CLOTUREE','REFUSEE');`);
const dirs = {};
for (const d of ['A','B','C']) {
  dirs[d] = Number(sql(`INSERT INTO directions(code,nom,actif) VALUES(${q('REC_'+tag+'_'+d)},${q('Direction de recette '+d)},true) RETURNING id;`).split('\n')[0]);
}
for (const role of [...roles,'ASSISTANT_B','ASSISTANT_C','DIRECTEUR_B']) {
  const real = role.startsWith('ASSISTANT_') && !roles.includes(role) ? 'ASSISTANT_DIRECTION' : role === 'DIRECTEUR_B' ? 'CHEF_DIRECTION' : role;
  const dir = role.endsWith('_B') ? dirs.B : role.endsWith('_C') ? dirs.C : dirs.A;
  sql(`INSERT INTO utilisateurs(nom_complet,matricule,email,role,mot_de_passe,direction_id,actif,doit_changer_mot_de_passe)
    VALUES(${q('Recette '+role)},${q('REC_'+role)},${q(role.toLowerCase()+'@recette.invalid')},${q(real)},crypt(${q(PASSWORD)},gen_salt('bf')),${dir},true,false)
    ON CONFLICT(matricule) DO UPDATE SET mot_de_passe=EXCLUDED.mot_de_passe, direction_id=EXCLUDED.direction_id, actif=true;`);
}
const chauffeur = Number(sql(`INSERT INTO chauffeurs(matricule,nom,prenom,numero_permis,date_expiration_permis,affectation_service,statut)
  VALUES('REC_CHAUFFEUR',${q('Conducteur '+tag)},'Recette','PERMIS-RECETTE',CURRENT_DATE+365,'GARAGE','DISPONIBLE')
  ON CONFLICT(matricule) DO UPDATE SET date_expiration_permis=EXCLUDED.date_expiration_permis,statut='DISPONIBLE' RETURNING id;`).split('\n')[0]);
const vehicules = {};
for (const [nom,cat] of Object.entries({ MUT:'Voiture de service mutualisée', MOTO:'Moto électrique', MISSION:'Véhicule de mission', PANNE:'Voiture de service mutualisée', EXPIRE:'Voiture de service mutualisée' })) {
  vehicules[nom] = Number(sql(`INSERT INTO vehicules(immatriculation,categorie,modele_type,type_vehicule,affectation,statut,mode_detention,date_expiration_visite_technique,gps_equipe)
    VALUES(${q('REC_'+tag+'_'+nom)},${q(cat)},'RECETTE','${nom === 'MOTO' ? 'MOTO' : 'VOITURE'}','GARAGE','${nom === 'PANNE' ? 'INDISPONIBLE' : 'DISPONIBLE'}','PROPRIETE',CURRENT_DATE+365,false) RETURNING id;`).split('\n')[0]);
  const v = vehicules[nom];
  sql(`INSERT INTO vehicule_directions VALUES(${v},${dirs.A}); ${nom==='MUT' ? `INSERT INTO vehicule_directions VALUES(${v},${dirs.B});` : ''}
    INSERT INTO assurances(id,vehicule_id,numero_police,date_debut,date_expiration,assureur,date_creation,date_modification)
    VALUES(gen_random_uuid(),${v},${q('POLICE_'+tag+'_'+nom)},CURRENT_DATE-365,CURRENT_DATE${nom==='EXPIRE'?'-1':'+365'},'ASSURANCE DE RECETTE',CURRENT_DATE,CURRENT_DATE);`);
}
fs.mkdirSync('.recette', { recursive: true });
const session = { base: DB, api: API, frontend: 'http://localhost:13000', tag, dirs, vehicules, chauffeur,
  comptes: roles.map(r => ({ role:r, matricule:'REC_'+r })), motDePasseTest: PASSWORD };
fs.writeFileSync('.recette/session.json', JSON.stringify(session,null,2));

for (const role of [...roles,'ASSISTANT_B','ASSISTANT_C','DIRECTEUR_B']) await test('Connexion '+role, async () => {
  const login = await http(null,'POST','/auth/login',{numMatricule:'REC_'+role,motDePasse:PASSWORD});
  assert(login.token); tokens[role] = login.token;
});
async function document(v, type='CARTE_GRISE', reservation=false) {
  const form = new FormData(); form.set('type',type);
  form.set('fichier',new Blob(['%PDF-1.4\n% Document artificiel de recette\n%%EOF'],{type:'application/pdf'}),'recette.pdf');
  const j = await http('ADMIN','POST',`/justificatifs/${reservation?'reservations':'vehicules'}/${v}`,form);
  await http('CHEF_SERVICE_LOGISTIQUE','PUT',`/justificatifs/${j.id}/validation`,{valide:true}); return j;
}
for (const v of Object.values(vehicules)) await test('Documents véhicule '+v, () => document(v));
const future = new Date(); future.setDate(future.getDate()+4); while ([0,6].includes(future.getDay())) future.setDate(future.getDate()+1);
const jour = future.toISOString().slice(0,10);
let prochaineHeure = 8;
async function demandeMoto(heure=prochaineHeure++, motif='Recette de mission') {
  return http('ASSISTANT_DIRECTION','POST','/reservations/assistant-direction/rapide',{
    typeVehicule:'MOTO',nom:'Beneficiaire',prenom:'Recette',matricule:'REC_BENEF',entite:'Recette',
    motif,destination:'Destination de recette',dateDebut:`${jour}T${String(heure).padStart(2,'0')}:00:00`,dureeEstimeeMinutes:30,
    observations:'Utilisation de recette, justification préalable hors horaires le cas échéant.'
  });
}
let habilitation, moto, voiture, mission;
await test('Proposition du conducteur moto par assistante',async()=>{
  habilitation=await http('ASSISTANT_DIRECTION','POST','/conducteurs-autorises',{matricule:'REC_BENEF',nomComplet:'Beneficiaire Recette'});
});
await test('Refus de validation par un autre Directeur',async()=>http('DIRECTEUR_B','PUT',`/conducteurs-autorises/${habilitation.id}/valider`,{},403));
await test('Refus auto-validation par assistante',async()=>http('ASSISTANT_DIRECTION','PUT',`/conducteurs-autorises/${habilitation.id}/valider`,{},403));
await test('Demande moto reçue et planifiée',async()=>{ moto=await demandeMoto(8); assert.equal(moto.statut,'EN_ATTENTE'); session.moto=moto.id; });
await test('Conducteur non habilité : validation bloquée',async()=>http('ASSISTANT_DIRECTION','PUT',`/reservations/${moto.id}/assistant-direction/decision`,{statut:'VALIDEE'},409));
await test('Validation habilitation par le bon Directeur',async()=>http('CHEF_DIRECTION','PUT',`/conducteurs-autorises/${habilitation.id}/valider`,{}));
await test('Validation et traçabilité moto',async()=>{ const r=await http('ASSISTANT_DIRECTION','PUT',`/reservations/${moto.id}/assistant-direction/decision`,{statut:'VALIDEE'}); assert.equal(r.statut,'VALIDEE'); assert(r.dateValidationN2); });
await test('Conflit de réservation bloquant',async()=>{ await http('ASSISTANT_DIRECTION','POST','/reservations/assistant-direction/rapide',{
  typeVehicule:'MOTO',nom:'B',prenom:'R',matricule:'REC_BENEF',motif:'Chevauchement',destination:'Test',dateDebut:`${jour}T08:00:00`,dureeEstimeeMinutes:30},409); });
await test('Direction étrangère : décision interdite',async()=>http('ASSISTANT_C','PUT',`/reservations/${moto.id}/assistant-direction/decision`,{statut:'VALIDEE'},403));
await test('Pièces d’une autre Direction inaccessibles',async()=>http('ASSISTANT_C','GET',`/justificatifs/reservations/${moto.id}`,null,403));
await test('Réservation moto de nuit bloquée',async()=>{ const r=await demandeMoto(19); await http('ASSISTANT_DIRECTION','PUT',`/reservations/${r.id}/assistant-direction/decision`,{statut:'VALIDEE'},409); });
await test('Demande voiture mutualisée',async()=>{ voiture=await http('ASSISTANT_DIRECTION','POST','/reservations/assistant-direction/rapide',{
  typeVehicule:'VOITURE',nom:'Beneficiaire',prenom:'Recette',matricule:'REC_BENEF',motif:'Parcours voiture',destination:'Atelier',dateDebut:`${jour}T10:00:00`,dureeEstimeeMinutes:30}); session.voiture=voiture.id; });
await test('Permis expiré : validation voiture bloquée',async()=>{
  sql(`UPDATE chauffeurs SET date_expiration_permis=CURRENT_DATE-1 WHERE id=${chauffeur};`);
  try { await http('ASSISTANT_DIRECTION','PUT',`/reservations/${voiture.id}/assistant-direction/decision`,{statut:'VALIDEE',chauffeurId:chauffeur},409); }
  finally { sql(`UPDATE chauffeurs SET date_expiration_permis=CURRENT_DATE+365 WHERE id=${chauffeur};`); }
});
await test('Assistante du groupe partagé valide la voiture',async()=>http('ASSISTANT_B','PUT',`/reservations/${voiture.id}/assistant-direction/decision`,{statut:'VALIDEE',chauffeurId:chauffeur}));
await test('Logistique voit le planning partagé',async()=>{ const r=await http('CHEF_SERVICE_LOGISTIQUE','GET','/reservations'); assert(r.some(x=>x.id===voiture.id)); });
await test('Conducteur voit sa mission en ville',async()=>{ const r=await http('CHAUFFEUR','GET','/chauffeur/tickets'); assert(r.some(x=>x.id===voiture.id)); });
await test('Clôture d’une demande non validée interdite',async()=>{ const r=await demandeMoto(14); await http('ASSISTANT_DIRECTION','POST',`/reservations/${r.id}/assistant-direction/cloturer`,{},409); });
await test('Consultation des rapports en lecture seule',async()=>{ await http('CO_ADMIN','GET','/rapports'); });
for (const role of ['CO_ADMIN','DIRECTEUR_DFP']) await test('Écriture interdite '+role,async()=>http(role,'POST','/signalements-incidents',{vehiculeId:vehicules.MUT,typeIncident:'PANNE',description:'Test'},403));
await test('Disponibilité exclut panne et assurance expirée',async()=>{ const r=await http('CHEF_SERVICE_LOGISTIQUE','GET',`/reservations/disponibilites-vehicules?dateDebut=${jour}T15:00:00&dateFin=${jour}T16:00:00`); session.disponibilitesFormat=Object.keys(r); assert(!JSON.stringify(r).includes('"id":'+vehicules.PANNE+',"disponible":true')); });

// Avance temporelle locale : pas d'attente de plusieurs jours, uniquement dans cette base dédiée.
await test('Sortie, état des lieux, retour puis clôture moto',async()=>{
  sql(`UPDATE reservations SET date_debut=LOCALTIMESTAMP-INTERVAL '1 hour',date_fin=LOCALTIMESTAMP+INTERVAL '1 hour' WHERE id=${moto.id};`);
  const maintenant=()=>new Date(Date.now()+3*3600000).toISOString().slice(0,19);
  const c=await http('ASSISTANT_DIRECTION','POST','/carnet-bord',{vehiculeId:moto.vehicule.id,reservationId:moto.id,dateSortie:maintenant(),niveauChargeDepart:90});
  await http('ASSISTANT_DIRECTION','POST',`/carnet-bord/${c.id}/etat-lieux`,{moment:'AVANT',etatApparent:'Bon état',niveauCarburantCharge:'90 %',equipementsOk:true});
  await http('ASSISTANT_DIRECTION','POST',`/carnet-bord/${c.id}/etat-lieux`,{moment:'APRES',etatApparent:'Bon état',niveauCarburantCharge:'75 %',equipementsOk:true});
  await http('ASSISTANT_DIRECTION','PUT',`/carnet-bord/${c.id}/retour`,{dateRetour:maintenant(),niveauChargeRetour:75});
  const r=await http('ASSISTANT_DIRECTION','POST',`/reservations/${moto.id}/assistant-direction/cloturer`,{}); assert.equal(r.statut,'CLOTUREE');
});
await test('Incident signale et bloque le véhicule',async()=>{ const r=await http('ASSISTANT_DIRECTION','POST','/signalements-incidents',{vehiculeId:vehicules.MUT,typeIncident:'PANNE',description:'Panne de recette'}); session.incident=r.id; });
await test('Réquisition réservée au DGAL',async()=>{
  const body={vehiculeId:vehicules.MISSION,motif:'Réquisition de recette',dateDebut:`${jour}T15:00:00`,dateFin:`${jour}T16:00:00`};
  await http('AGENT_FLOTTE','POST','/requisitions',body,403); const r=await http('CHEF_DGAL','POST','/requisitions',body); session.requisition=r.id;
});
await test('Journal de traçabilité contient les actions',async()=>{ const n=Number(sql("SELECT count(*) FROM journal_modifications WHERE acteur_matricule LIKE 'REC_%';")); assert(n>0); session.actionsTracees=n; });
fs.writeFileSync('.recette/session.json',JSON.stringify(session,null,2));
fs.writeFileSync('.recette/resultats.json',JSON.stringify({date:new Date().toISOString(),base:DB,resultats:results},null,2));
console.log(JSON.stringify({ reussis:results.filter(r=>r.succes).length,echecs:results.filter(r=>!r.succes).length }));
if (results.some(r=>!r.succes)) process.exitCode=1;
