

import { useEffect, useState } from "react";

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  tabletLg: 1024,
  desktop: 1280,
} as const;

export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [width, setWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1280);

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWidth(newWidth);

      if (newWidth < BREAKPOINTS.tablet) {
        setDeviceType("mobile");
      } else if (newWidth < BREAKPOINTS.tabletLg) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    deviceType,
    width,
    isMobile: deviceType === "mobile",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop",
    isMobileOrTablet: deviceType === "mobile" || deviceType === "tablet",
  };
}

export function useOrientation() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    typeof window !== "undefined" && window.innerWidth > window.innerHeight
      ? "landscape"
      : "portrait"
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    };

    window.addEventListener("resize", handleOrientationChange);
    return () => window.removeEventListener("resize", handleOrientationChange);
  }, []);

  return orientation;
}

export const MOBILE_GLOBAL_STYLES = `
  
  *, *::before, *::after {
    box-sizing: border-box;
  }

  
  @media (max-width: ${BREAKPOINTS.tablet}px) {
    input[type="text"],
    input[type="number"],
    input[type="email"],
    input[type="tel"],
    input[type="password"],
    input[type="date"],
    input[type="time"],
    input[type="datetime-local"],
    textarea,
    select {
      font-size: 16px !important; 
    }
  }

  
  html {
    -webkit-overflow-scrolling: touch;
  }

  
  * {
    -webkit-tap-highlight-color: transparent;
  }

  
  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  
  * {
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }
`;

export function responsiveStyle<T extends React.CSSProperties>(
  mobile: T,
  tablet?: Partial<T>,
  desktop?: Partial<T>
): T {
  const width = typeof window !== "undefined" ? window.innerWidth : 1280;

  if (width < BREAKPOINTS.tablet) {
    return mobile;
  } else if (width < BREAKPOINTS.tabletLg && tablet) {
    return { ...mobile, ...tablet };
  } else if (desktop) {
    return { ...mobile, ...tablet, ...desktop };
  }

  return mobile;
}

export const MOBILE_VIEWPORT_META = {
  name: "viewport",
  content: "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover",
};

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error: msMaxTouchPoints existe sur IE
    navigator.msMaxTouchPoints > 0
  );
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as  unknown as { MSStream?: unknown }).MSStream;
}

export function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

export function getResponsiveCardStyle(isMobile: boolean): React.CSSProperties {
  return {
    padding: isMobile ? "14px" : "20px",
    borderRadius: isMobile ? "10px" : "12px",
    boxShadow: isMobile
      ? "0 1px 3px rgba(15, 23, 42, 0.08)"
      : "0 2px 8px rgba(15, 23, 42, 0.08)",
  };
}

export function getResponsiveGridStyle(
  columns: { mobile: number; tablet: number; desktop: number },
  gap: { mobile: number; tablet: number; desktop: number }
): string {
  return `
    display: grid;
    grid-template-columns: repeat(${columns.desktop}, minmax(0, 1fr));
    gap: ${gap.desktop}px;

    @media (max-width: ${BREAKPOINTS.tabletLg}px) {
      grid-template-columns: repeat(${columns.tablet}, minmax(0, 1fr));
      gap: ${gap.tablet}px;
    }

    @media (max-width: ${BREAKPOINTS.tablet}px) {
      grid-template-columns: repeat(${columns.mobile}, minmax(0, 1fr));
      gap: ${gap.mobile}px;
    }
  `;
}

export function getResponsiveFontSize(
  desktop: number,
  tablet?: number,
  mobile?: number
): number {
  const width = typeof window !== "undefined" ? window.innerWidth : 1280;

  if (width < BREAKPOINTS.tablet && mobile) {
    return mobile;
  } else if (width < BREAKPOINTS.tabletLg && tablet) {
    return tablet;
  }

  return desktop;
}

export function getResponsiveContainerPadding(deviceType: "mobile" | "tablet" | "desktop"): string {
  switch (deviceType) {
    case "mobile":
      return "14px";
    case "tablet":
      return "20px";
    case "desktop":
      return "28px";
  }
}

export const TOUCH_FRIENDLY_BUTTON_STYLE: React.CSSProperties = {
  minHeight: "44px",
  minWidth: "44px",
  padding: "10px 16px",
  cursor: "pointer",
  touchAction: "manipulation",
};

export function getMobileDialogStyle(isMobile: boolean): React.CSSProperties {
  if (isMobile) {
    return {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      margin: 0,
      maxWidth: "100%",
      maxHeight: "100%",
      borderRadius: 0,
      overflow: "auto",
    };
  }

  return {
    maxWidth: "600px",
    maxHeight: "90vh",
    margin: "20px auto",
    borderRadius: "12px",
  };
}
