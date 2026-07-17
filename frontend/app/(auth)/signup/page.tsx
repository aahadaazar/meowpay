import { SignupForm } from "@/components/signup-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <header className="mx-auto flex h-12 w-full max-w-7xl items-center justify-between">
        <a className="text-title-md font-semibold" href="/login">MeowPay</a>
        <ThemeToggle />
      </header>
      <section className="mx-auto grid w-full max-w-md gap-6 pt-16 sm:pt-24">
        <div>
          <p className="text-caption-uppercase uppercase text-muted-foreground">Treat money, simply</p>
          <h1 className="mt-3 text-display-sm">Create your account</h1>
          <p className="mt-3 text-body-md text-body">One account keeps your cats and their treat wallets together.</p>
        </div>
        <SignupForm />
        <p className="text-body-sm text-body">
          Already have an account?{" "}
          <a className="font-semibold underline underline-offset-4 hover:text-foreground" href="/login">Log in</a>
        </p>
      </section>
    </main>
  );
}
