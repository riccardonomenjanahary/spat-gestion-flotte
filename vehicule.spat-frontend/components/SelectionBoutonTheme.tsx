"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTED_ATTRIBUTE = "data-theme-selected";
const DEFAULT_ATTRIBUTE = "data-default-primary";
const BUTTON_SELECTOR = "button:not(.spat-profile-button):not([data-raw-btn])";

function estVisible(element: HTMLElement) {
  return element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== "hidden"
    && getComputedStyle(element).display !== "none";
}

function selectionnerBouton(element: HTMLElement | null) {
  document.querySelectorAll<HTMLElement>(`[${SELECTED_ATTRIBUTE}="true"]`).forEach((bouton) => {
    bouton.removeAttribute(SELECTED_ATTRIBUTE);
  });

  if (element) {
    element.setAttribute(SELECTED_ATTRIBUTE, "true");
  }
}

function choisirBoutonInitial(conteneur: ParentNode = document) {
  const boutons = Array.from(conteneur.querySelectorAll<HTMLElement>(BUTTON_SELECTOR))
    .filter((bouton) => !bouton.hasAttribute("disabled") && estVisible(bouton));
  const bouton = boutons.find((candidat) => candidat.hasAttribute(DEFAULT_ATTRIBUTE))
    || boutons.find((candidat) => Boolean(candidat.textContent?.trim()))
    || boutons[0]
    || null;

  selectionnerBouton(bouton);
}

export default function SelectionBoutonTheme() {
  const pathname = usePathname();

  useEffect(() => {
    const appliquerSelectionInitiale = () => {
      const dialogue = Array.from(document.querySelectorAll<HTMLElement>(
        '[aria-modal="true"], [role="dialog"], .assistant-direction-modal'
      )).find(estVisible);

      if (dialogue) {
        choisirBoutonInitial(dialogue);
      } else {
        choisirBoutonInitial();
      }
    };

    const actualiserSelection = (event: Event) => {
      const cible = event.target;
      if (!(cible instanceof Element)) return;

      const bouton = cible.closest<HTMLElement>(BUTTON_SELECTOR);
      if (bouton && estVisible(bouton)) {
        selectionnerBouton(bouton);
      }
    };

    appliquerSelectionInitiale();
    document.addEventListener("click", actualiserSelection, true);
    document.addEventListener("focusin", actualiserSelection, true);

    const observateur = new MutationObserver(() => {
      const dialogue = Array.from(document.querySelectorAll<HTMLElement>(
        '[aria-modal="true"], [role="dialog"], .assistant-direction-modal'
      )).find(estVisible);
      const selection = document.querySelector<HTMLElement>(`[${SELECTED_ATTRIBUTE}="true"]`);

      if (dialogue && !dialogue.contains(selection)) {
        choisirBoutonInitial(dialogue);
      } else if (!selection?.isConnected) {
        appliquerSelectionInitiale();
      }
    });

    observateur.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", actualiserSelection, true);
      document.removeEventListener("focusin", actualiserSelection, true);
      observateur.disconnect();
    };
  }, [pathname]);

  return null;
}
