import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { LogoMark } from "@/components/layout/LogoMark";

/** Full-bleed background with the auth card; from 1024 px the showcase sits beside it. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[90rem] items-center gap-10 px-4 py-10 lg:grid-cols-[1.1fr_minmax(0,28rem)] lg:px-12 3xl:max-w-[110rem]">
      <AuthShowcase />
      <div className="mx-auto w-full max-w-[28rem]">
        <p className="mb-5 flex items-center gap-2.5 font-display text-2xl font-semibold">
          <LogoMark className="size-10" />
          RevoTask
        </p>
        {children}
      </div>
    </main>
  );
}
