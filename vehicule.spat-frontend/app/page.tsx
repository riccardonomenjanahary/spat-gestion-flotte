"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 800);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
        }}
      >
        <img
          src="/logo.png"
          alt="Logo SPAT"
          style={{
            width: 90,
            height: 90,
            position: "relative",
            zIndex: 2,
          }}
        />

        <svg
          viewBox="0 0 180 180"
          width="180"
          height="180"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            animation: "orbit 6s linear infinite",
          }}
        >
          <defs>
            <path
              id="circlePath"
              d="M 90,90 m -70,0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0"
              fill="none"
            />
          </defs>

          <text
            fill="#dc2626"
            fontSize="14"
            fontWeight="700"
            letterSpacing="4"
          >
            <textPath
              href="#circlePath"
              startOffset="0%"
            >
              Gestion de parc automobile
            </textPath>
          </text>
        </svg>
      </div>

      <div
        style={{
          width: 36,
          height: 36,
          border: "4px solid #e5e7eb",
          borderTop: "4px solid #dc2626",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes orbit {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}