import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 text-zinc-400 hover:text-[#e78a53] transition-colors duration-200 flex items-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Home</span>
      </Link>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-[#e78a53]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#e78a53]/5 rounded-full blur-3xl" />

      <div className="relative z-10">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 shadow-xl",
              headerTitle: "text-white",
              headerSubtitle: "text-zinc-400",
              socialButtonsBlockButton:
                "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-white hover:text-black hover:border-white transition-all duration-200",
              socialButtonsBlockButtonText: "text-zinc-300",
              dividerLine: "bg-zinc-800",
              dividerText: "text-zinc-500",
              formFieldLabel: "text-zinc-300",
              formFieldInput:
                "bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[#e78a53] focus:ring-[#e78a53]/20",
              formButtonPrimary:
                "bg-[#e78a53] hover:bg-[#e78a53]/90 text-white font-medium transition-colors",
              footerActionLink: "text-[#e78a53] hover:text-[#e78a53]/80",
              identityPreviewText: "text-zinc-300",
              identityPreviewEditButton: "text-[#e78a53] hover:text-[#e78a53]/80",
              formFieldAction: "text-[#e78a53] hover:text-[#e78a53]/80",
              alertText: "text-zinc-300",
              formFieldWarningText: "text-amber-400",
              formFieldSuccessText: "text-emerald-400",
            },
            variables: {
              colorPrimary: "#e78a53",
              colorBackground: "transparent",
              colorText: "#ffffff",
              colorTextSecondary: "#a1a1aa",
              colorInputBackground: "rgba(39, 39, 42, 0.5)",
              colorInputText: "#ffffff",
              borderRadius: "0.75rem",
            },
          }}
        />
      </div>
    </div>
  )
}
