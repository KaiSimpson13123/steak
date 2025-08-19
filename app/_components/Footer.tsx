"use client";
import React from "react";
import { useCommonStore } from "@/app/_store/commonStore";
import Link from "next/link";
import { Coffee, Github, Twitter } from "lucide-react";

export default function Footer() {
  const handleLogoClick = () => {
    const targetSection: HTMLElement | null = document.getElementById(
      "Top".toLowerCase()
    );
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth" });
    }
  };
  const { balance, clearCommonState } = useCommonStore();
  const resetMoney = () => {
    const pass = prompt("Enter Password");

    if (pass === process.env.NEXT_PUBLIC_PASSWORD) {
      clearCommonState();
    } else {
      alert("Password Incorrect");
    }
  }

  return (
    <footer className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-black/40 backdrop-blur-lg border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {/* About Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-success to-emerald-500 bg-clip-text text-transparent">
              About Steak
            </h3>
            <p className="text-white/70 text-sm leading-relaxed">
              An open-source project dedicated to providing a safe and
              educational platform for learning about crypto gambling mechanics
              without real financial risk.
            </p>
          </div>

          {/* Quick Links Section */}
          <div className="space-y-6"></div>

          {/* Community Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">
              Join Our Community
            </h3>
            <p className="text-white/70 text-sm mb-6">
              Connect with us and contribute to make Steak even better!
            </p>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <p className="text-center text-white/50 text-sm">
            © {new Date().getFullYear()} Steak. All rights reserved.
          </p>
          <a>
            <p onClick={() => resetMoney()} className="cursor-pointer text-center text-white/50 text-sm">
              Reset Money
            </p>
          </a>
        </div>
      </div>
    </footer>
  );
}
