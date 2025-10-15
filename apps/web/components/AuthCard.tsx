"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import Image from "next/image";

const AuthCard = () => {
  return (
    <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#102b22] p-8 text-white shadow-[0_25px_85px_rgba(4,20,15,0.65)]">
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <Image src="/logo-ano.png" alt="ANO Designer" width={64} height={64} priority />
        <div>
          <h1 className="text-2xl font-semibold">Área protegida</h1>
          <p className="mt-2 text-sm text-white/65">
            Autenticação Supabase em breve. Enquanto isso, este formulário é apenas um placeholder.
          </p>
        </div>
      </div>
      <form className="flex flex-col gap-4" aria-label="Formulário de autenticação">
        <div className="space-y-2">
          <Label htmlFor="placeholder-email">E-mail</Label>
          <Input id="placeholder-email" type="email" placeholder="nome@empresa.com" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="placeholder-password">Senha</Label>
          <PasswordInput id="placeholder-password" placeholder="********" disabled />
        </div>
        <Button type="button" disabled title="Integração Supabase pendente">
          Entrar
        </Button>
      </form>
    </section>
  );
};

export default AuthCard;
