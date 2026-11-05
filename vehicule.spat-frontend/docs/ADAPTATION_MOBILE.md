# Guide d'Adaptation Mobile - SPAT GPA

Ce document décrit les principes et pratiques d'adaptation mobile de l'application de gestion du parc automobile SPAT.

---

## 🎯 Objectifs

- Permettre l'utilisation complète de l'application sur **téléphones** et **tablettes**
- Optimiser l'expérience utilisateur pour les **écrans tactiles**
- Garantir la **lisibilité** et l'**accessibilité** sur petits écrans
- Maintenir toutes les **fonctionnalités** disponibles sur desktop

---

## 📱 Breakpoints Responsive

L'application utilise les breakpoints suivants :

| Type d'appareil | Largeur | Description |
|----------------|---------|-------------|
| **Mobile** | < 768px | Téléphones en portrait et petit format |
| **Tablet** | 768px - 1024px | Tablettes en portrait |
| **Tablet Landscape** | 1024px - 1280px | Tablettes en paysage |
| **Desktop** | > 1280px | Ordinateurs |

---

## 🛠️ Configuration Technique

### 1. Viewport Meta Tag

Déjà configuré dans `app/layout.tsx` avec :

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
```

**Explications** :
- `width=device-width` : Adapte la largeur à l'écran
- `initial-scale=1.0` : Zoom initial à 100%
- `maximum-scale=5.0` : Permet le zoom jusqu'à 500% (accessibilité)
- `user-scalable=yes` : Autorise le pinch-to-zoom
- `viewport-fit=cover` : Support pour iPhone X+ (encoche)

### 2. Prévention du Zoom Automatique iOS

Sur iOS, les champs `<input>` avec `font-size < 16px` déclenchent un zoom automatique. Solution :

```css
@media (max-width: 768px) {
  input, textarea, select {
    font-size: 16px !important;
  }
}
```

### 3. Hook personnalisé `useDeviceType`

Utilisez le hook pour adapter dynamiquement l'interface :

```typescript
import { useDeviceType } from "@/app/lib/mobile";

function MonComposant() {
  const { isMobile, isTablet, deviceType, width } = useDeviceType();

  return (
    <div style={{ padding: isMobile ? "14px" : "28px" }}>
      {isMobile ? <VersionMobile /> : <VersionDesktop />}
    </div>
  );
}
```

---

## 🎨 Principes de Design Mobile

### 1. Navigation simplifiée

**Desktop** :
- Menus déroulants
- Plusieurs niveaux de navigation
- Sidebar visible

**Mobile** :
- Menu hamburger (☰)
- Navigation par onglets en bas
- Fil d'Ariane réduit

### 2. Formulaires adaptatifs

**Règles** :
- **1 colonne** sur mobile (largeur < 768px)
- **2 colonnes** sur tablette (768px - 1024px)
- **3+ colonnes** sur desktop (> 1024px)

**Exemple** :

```tsx
<div style={{
  display: "grid",
  gridTemplateColumns: isMobile 
    ? "1fr" 
    : isTablet 
      ? "repeat(2, 1fr)" 
      : "repeat(3, 1fr)",
  gap: isMobile ? "12px" : "16px",
}}>
  {/* Champs du formulaire */}
</div>
```

### 3. Boutons tactiles

**Taille minimale recommandée** : 44x44px (Apple HIG, Material Design)

```tsx
const buttonStyle: CSSProperties = {
  minHeight: "44px",
  minWidth: "44px",
  padding: "12px 18px",
  fontSize: "14px",
  touchAction: "manipulation", // Désactive le double-tap to zoom
};
```

### 4. Cartes et conteneurs

**Espacements** :
- Mobile : padding 14px, gap 12px
- Tablet : padding 18px, gap 14px
- Desktop : padding 24px, gap 16px

```tsx
const cardStyle: CSSProperties = {
  padding: isMobile ? "14px" : "24px",
  borderRadius: isMobile ? "10px" : "12px",
  marginBottom: isMobile ? "12px" : "16px",
};
```

### 5. Tableaux responsive

**Stratégies** :

#### A. Scroll horizontal (petits tableaux)

```tsx
<div style={{ overflowX: "auto" }}>
  <table style={{ minWidth: "600px" }}>
    {/* Contenu */}
  </table>
</div>
```

#### B. Cartes (meilleure UX mobile)

```tsx
{isMobile ? (
  <div>
    {data.map(item => (
      <div key={item.id} style={cardStyle}>
        <div><strong>Nom :</strong> {item.nom}</div>
        <div><strong>Date :</strong> {item.date}</div>
      </div>
    ))}
  </div>
) : (
  <table>{/* Version tableau desktop */}</table>
)}
```

### 6. Modales et dialogues

**Mobile** :
- Plein écran (100vw x 100vh)
- Bouton fermer en haut à droite
- Scroll vertical si contenu long

**Desktop** :
- Centré avec max-width: 600px
- Overlay semi-transparent
- Border-radius pour l'esthétique

```tsx
const modalStyle: CSSProperties = isMobile ? {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 0,
  overflow: "auto",
} : {
  maxWidth: "600px",
  margin: "20px auto",
  borderRadius: "12px",
};
```

### 7. Typographie responsive

**Tailles de police** :

| Élément | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| H1 | 22px | 26px | 32px |
| H2 | 18px | 20px | 24px |
| H3 | 16px | 18px | 20px |
| Body | 14px | 14px | 15px |
| Small | 12px | 12px | 13px |

```tsx
const titleStyle: CSSProperties = {
  fontSize: isMobile ? "22px" : isTablet ? "26px" : "32px",
  lineHeight: 1.3,
  marginBottom: isMobile ? "12px" : "16px",
};
```

---

## 📋 Checklist d'Adaptation par Page

### ✅ Pages Prioritaires (Utilisation Mobile Fréquente)

#### 1. **Assistant de Direction** (`/assistant-direction`)
- [x] Formulaire mission en 1 colonne sur mobile
- [x] Calendrier adapté (vue jour sur mobile)
- [x] Cartes statistiques en grille 2x2 → 1 colonne
- [ ] Menu latéral replié par défaut
- [ ] Boutons d'action flottants

#### 2. **Chef de Direction** (`/chef-direction`)
- [x] Formulaire simplifié mobile
- [x] Calendrier responsive
- [ ] Navigation par onglets

#### 3. **Mécanicien DID** (`/mecanicien-did`)
- [ ] Fiche de contrôle adaptée
- [ ] Sections accordéon sur mobile
- [ ] Checklist tactile (cases à cocher 24x24px)
- [ ] Signature électronique mobile

#### 4. **Chef Service Logistique** (`/chef-service-logistique`)
- [ ] Tableau missions en cartes sur mobile
- [ ] Filtres dans un drawer mobile
- [ ] Actions rapides accessibles

#### 5. **Agent Flotte** (`/agent-flotte`)
- [x] Carte GPS responsive (déjà implémenté)
- [ ] Liste véhicules en cartes
- [ ] Carnet de bord mobile-friendly

#### 6. **Login** (`/login`)
- [x] Formulaire responsive (déjà fait)
- [x] Logo adapté
- [x] Clavier virtuel optimisé

### 🔄 Pages Secondaires (Usage Desktop Privilégié)

#### 7. **Admin** (`/admin/*`)
- [ ] Tableaux scroll horizontal
- [ ] Stats en grilles adaptatives
- [ ] Formulaires 1-2 colonnes selon taille

---

## 🎯 Composants à Adapter en Priorité

### 1. **EnTete.tsx**
```tsx
// Version mobile avec menu hamburger
const EnTete = () => {
  const { isMobile } = useDeviceType();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{ 
      padding: isMobile ? "10px 14px" : "14px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}>
      {isMobile && (
        <button onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={24} />
        </button>
      )}
      {/* Logo, titre, notifications */}
    </header>
  );
};
```

### 2. **Sidebar** (si existant)
```tsx
// Convertir en drawer mobile
<div style={{
  position: isMobile ? "fixed" : "sticky",
  left: isMobile && !isOpen ? "-300px" : "0",
  width: isMobile ? "280px" : "250px",
  transition: "left 0.3s ease",
  zIndex: isMobile ? 1000 : "auto",
}}>
  {/* Contenu navigation */}
</div>
```

### 3. **FicheControleVehicule.tsx**
```tsx
// Sections accordéon sur mobile
{isMobile ? (
  <details>
    <summary>{section.titre}</summary>
    <div>{section.items.map(...)}</div>
  </details>
) : (
  <table>{/* Version tableau desktop */}</table>
)}
```

### 4. **Calendrier**
```tsx
// Vue jour sur mobile, vue semaine sur tablet, vue mois sur desktop
const calendarView = isMobile ? "day" : isTablet ? "week" : "month";
```

---

## 🚀 Optimisations Performances Mobile

### 1. Images lazy loading

```tsx
<img 
  src="/logo.png" 
  alt="SPAT Logo" 
  loading="lazy"
  srcSet="/logo-small.png 480w, /logo-medium.png 768w, /logo-large.png 1280w"
  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
/>
```

### 2. Code splitting par route

Next.js le fait automatiquement, mais pour les composants lourds :

```tsx
import dynamic from "next/dynamic";

const CarteGPS = dynamic(() => import("@/components/CarteGpsFlotte"), {
  ssr: false,
  loading: () => <div>Chargement de la carte...</div>,
});
```

### 3. Réduire les re-renders

```tsx
import { memo } from "react";

const MissionCard = memo(({ mission }: { mission: Mission }) => {
  // Rendu du composant
});
```

---

## 🧪 Tests Mobile

### Outils de test

1. **Chrome DevTools** :
   - F12 → Toggle device toolbar (Ctrl+Shift+M)
   - Tester iPhone SE, iPhone 12, iPad, Galaxy S21

2. **Vrais appareils** :
   - Connecter téléphone via USB
   - Chrome Remote Debugging : `chrome://inspect`

3. **Responsive Design Mode Firefox** :
   - F12 → Icône téléphone/tablette

### Checklist de test

- [ ] Tous les boutons sont cliquables (zone 44x44px minimum)
- [ ] Pas de zoom automatique sur focus input
- [ ] Scroll fluide (pas de scroll horizontal non intentionnel)
- [ ] Modales plein écran sur mobile
- [ ] Menus accessibles et fermables
- [ ] Orientation portrait ET paysage fonctionnelles
- [ ] Performance : temps de chargement < 3s sur 3G
- [ ] Formulaires soumissibles avec clavier virtuel
- [ ] Pas de texte coupé ou illisible

---

## 📝 Bonnes Pratiques

### ✅ À FAIRE

- Utiliser `useDeviceType()` pour détecter l'appareil
- Tester sur vrais appareils Android + iOS
- Utiliser `font-size: 16px` minimum sur les inputs (mobile)
- Prévoir des zones tactiles ≥ 44x44px
- Afficher des versions simplifiées sur mobile (cartes au lieu de tableaux)
- Utiliser `touch-action: manipulation` sur les boutons
- Prévoir des états :hover alternatifs pour tactile (:active)

### ❌ À ÉVITER

- Désactiver le zoom utilisateur (`user-scalable=no`)
- Utiliser `position: fixed` sans gérer le scroll
- Afficher des tooltips (incompatibles tactile) → utiliser des infobulles cliquables
- Tableaux larges sans scroll horizontal
- Pop-ups qui dépassent de l'écran
- Animations complexes (performances)
- Dépendances lourdes non lazy-loadées

---

## 🔧 Configuration Next.js pour Mobile

### 1. Optimiser les images

```js
// next.config.js
module.exports = {
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp'],
  },
};
```

### 2. Service Worker (PWA - optionnel)

Permet l'installation de l'app sur l'écran d'accueil :

```bash
npm install next-pwa
```

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // config existante
});
```

---

## 📊 Statistiques d'Usage Mobile (à tracker)

Métriques importantes :
- % d'utilisateurs mobiles vs desktop
- Temps de chargement mobile
- Taux de rebond mobile
- Pages les plus visitées sur mobile
- Erreurs spécifiques mobile

---

## 🆘 Problèmes Courants et Solutions

### Problème 1 : Zoom automatique iOS sur input focus

**Solution** :
```css
input { font-size: 16px !important; }
```

### Problème 2 : Scroll bloqué dans les modales

**Solution** :
```tsx
useEffect(() => {
  if (modalOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "unset";
  }
}, [modalOpen]);
```

### Problème 3 : Clics fantômes (ghost clicks)

**Solution** :
```css
* {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
```

### Problème 4 : Viewport height incohérent sur mobile (barre d'adresse)

**Solution** :
```css
.full-height {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height (CSS moderne) */
}
```

---

## 📚 Ressources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design - Touch targets](https://m3.material.io/foundations/interaction/gestures#d150c9b7-3f43-4e8f-9f72-63d2ed0d69b9)
- [Web.dev - Responsive design](https://web.dev/responsive-web-design-basics/)
- [MDN - Mobile Web Best Practices](https://developer.mozilla.org/en-US/docs/Web/Guide/Mobile)

---

## ✅ Résumé : Actions Immédiates

1. **Importer le hook `useDeviceType`** dans les pages principales
2. **Adapter les formulaires** à 1 colonne sur mobile
3. **Convertir les tableaux** en cartes sur mobile
4. **Tester sur appareils réels** (iOS + Android)
5. **Vérifier toutes les zones tactiles** ≥ 44x44px
6. **Optimiser les modales** en plein écran mobile
7. **Ajouter breakpoints CSS** manquants
